// One-time codes (OTP) for email confirmation and password reset (FR02, FR17, NFR02;
// docs/DEVIATIONS.md W21).
//
//   - 6 digits from a cryptographically secure random generator (crypto.randomInt)
//   - valid for 10 minutes, used once
//   - only an HMAC-SHA256 of the code is stored, keyed with OTP_SECRET (or JWT_SECRET if that is
//     not set) and bound to the user and the purpose; checked in constant time
//   - at most 5 wrong tries; then the code is invalidated and a new one must be requested
//   - a new code invalidates the previous one
//   - at most one new code per 60 seconds and 10 per 24 hours for an account
const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, AuthToken } = require('../models');
const HttpError = require('../utils/httpError');
const audit = require('./auditService');
const { sendNow } = require('./notificationService');
const { render } = require('./emailTemplates');

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const DAILY_CAP = 10;

const EMAIL_TYPE = { verify_email: 'verify_code', reset_password: 'reset_code' };
const TEMPLATE = { verify_email: 'verifyCode', reset_password: 'resetCode' };

function otpSecret() {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('OTP_SECRET or JWT_SECRET must be set');
  return secret;
}

// "000000" to "999999", every value equally likely
function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// The same code for another user or purpose gives a different hash
function hashCode(userId, purpose, code) {
  return crypto.createHmac('sha256', otpSecret()).update(`${purpose}:${userId}:${code}`).digest('hex');
}

function sameHash(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// Creates a new code (invalidating older ones) unless the account asked too often.
// Returns { code, token } or { limited: 'cooldown' | 'daily_cap', retryAfter }.
async function issueCode(user, purpose, { actorId = user.id } = {}) {
  const now = Date.now();
  const latest = await AuthToken.findOne({ where: { user_id: user.id, purpose }, order: [['id', 'DESC']] });
  if (latest) {
    const ageSeconds = (now - new Date(latest.created_at).getTime()) / 1000;
    if (ageSeconds < RESEND_COOLDOWN_SECONDS) return { limited: 'cooldown', retryAfter: Math.ceil(RESEND_COOLDOWN_SECONDS - ageSeconds) };
  }
  const today = await AuthToken.count({ where: { user_id: user.id, purpose, created_at: { [Op.gte]: new Date(now - 24 * 3600 * 1000) } } });
  if (today >= DAILY_CAP) return { limited: 'daily_cap', retryAfter: null };

  const code = generateCode();
  const token = await sequelize.transaction(async (transaction) => {
    await AuthToken.update({ used_at: new Date() }, { where: { user_id: user.id, purpose, used_at: null }, transaction });
    const row = await AuthToken.create(
      { user_id: user.id, purpose, token_hash: hashCode(user.id, purpose, code), expires_at: new Date(now + CODE_TTL_MINUTES * 60 * 1000) },
      { transaction }
    );
    await audit.log({ actorId, action: `code.issued.${purpose}`, entityType: 'user', entityId: user.id }, { transaction });
    return row;
  });
  return { code, token };
}

// Emails the code through the outbox. The outbox row stores only the token id, never the code.
async function sendCode(user, purpose, code, token) {
  const message = render(TEMPLATE[purpose], user.preferred_language, { name: user.full_name, code, minutes: CODE_TTL_MINUTES });
  const { result } = await sendNow({
    user,
    type: EMAIL_TYPE[purpose],
    eventKey: `code:${token.id}`,
    message,
    payload: { purpose, token_id: token.id },
  });
  return result.status; // sent | failed | skipped
}

// Issues and sends a code. Returns { status: 'sent'|'failed'|'skipped'|'limited', retryAfter }.
async function issueAndSend(user, purpose, options) {
  const issued = await issueCode(user, purpose, options);
  if (issued.limited) return { status: 'limited', limited: issued.limited, retryAfter: issued.retryAfter };
  return { status: await sendCode(user, purpose, issued.code, issued.token), retryAfter: RESEND_COOLDOWN_SECONDS };
}

// Checks a code typed by the user. On success the code is used up and true is returned.
// On failure an HttpError explains why:
//   CODE_INVALID       no active code (never requested, already used, or replaced by a newer one)
//   CODE_EXPIRED       older than 10 minutes
//   WRONG_CODE         wrong digits; details.attempts_left tells how many tries remain
//   TOO_MANY_ATTEMPTS  the 5th wrong try: the code is now invalid, a new one must be requested
// Wrong tries are saved before the error is thrown (separate transaction), so they always count.
async function verifyCode(user, purpose, code) {
  const outcome = await sequelize.transaction(async (transaction) => {
    if (!user) return { error: 'CODE_INVALID' };
    // Row lock: two tries at the same moment are counted one after the other
    const row = await AuthToken.findOne({
      where: { user_id: user.id, purpose, used_at: null },
      order: [['id', 'DESC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!row) return { error: 'CODE_INVALID' };
    if (new Date(row.expires_at) <= new Date()) {
      await row.update({ used_at: new Date() }, { transaction });
      return { error: 'CODE_EXPIRED' };
    }
    if (!sameHash(row.token_hash, hashCode(user.id, purpose, String(code)))) {
      const attempts = row.attempts + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      await row.update({ attempts, used_at: locked ? new Date() : null }, { transaction });
      await audit.log({ actorId: user.id, action: locked ? `code.locked.${purpose}` : `code.wrong.${purpose}`, entityType: 'user', entityId: user.id }, { transaction });
      return locked ? { error: 'TOO_MANY_ATTEMPTS' } : { error: 'WRONG_CODE', attemptsLeft: MAX_ATTEMPTS - attempts };
    }
    await row.update({ used_at: new Date() }, { transaction });
    return { ok: true };
  });

  if (outcome.ok) return true;
  const messages = {
    CODE_INVALID: 'There is no valid code. Please ask for a new one.',
    CODE_EXPIRED: 'This code has expired. Please ask for a new one.',
    WRONG_CODE: 'The code is not correct.',
    TOO_MANY_ATTEMPTS: 'Too many wrong tries. Please ask for a new code.',
  };
  throw new HttpError(400, outcome.error, messages[outcome.error], outcome.attemptsLeft !== undefined ? { attempts_left: outcome.attemptsLeft } : undefined);
}

module.exports = {
  CODE_TTL_MINUTES,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  DAILY_CAP,
  EMAIL_TYPE,
  generateCode,
  hashCode,
  issueCode,
  sendCode,
  issueAndSend,
  verifyCode,
};

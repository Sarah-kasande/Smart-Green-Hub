// AuthService (Figure 7): registration, email confirmation, login and password reset.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize, User, Nursery, Institution, AuthToken } = require('../models');
const HttpError = require('../utils/httpError');
const { generateToken, hashToken } = require('../utils/tokens');
const audit = require('./auditService');
const { sendEmail } = require('./emailService');
const { render, appUrl } = require('./emailTemplates');

const BCRYPT_ROUNDS = 10;
const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_PASSWORD_TTL_MS = 10 * 60 * 1000; // 10 minutes (FR17)
const SESSION_DAYS = 7;

// A real bcrypt hash of a random value. Used when the email does not exist, so a failed
// login takes the same time either way and does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-' + Date.now(), BCRYPT_ROUNDS);

function jwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
}

const normaliseEmail = (email) => String(email || '').trim().toLowerCase();

// Only these user fields ever leave the server.
function toSafeUser(user) {
  return {
    id: user.id,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    preferred_language: user.preferred_language,
    email_verified_at: user.email_verified_at,
  };
}

// The login cookie holds a signed JWT with the user id, role and token_version.
// token_version lets us invalidate every existing session by increasing it (password reset).
function signSession(user) {
  return jwt.sign({ sub: user.id, role: user.role, tv: user.token_version }, jwtSecret(), {
    expiresIn: `${SESSION_DAYS}d`,
  });
}

function verifySession(token) {
  return jwt.verify(token, jwtSecret());
}

// Creates a single-use link token. Any older unused token for the same purpose is cancelled,
// so only the newest link works. Returns the raw token (only the hash is stored).
async function createLinkToken(userId, purpose, ttlMs, transaction) {
  const now = new Date();
  await AuthToken.update(
    { used_at: now },
    { where: { user_id: userId, purpose, used_at: null }, transaction }
  );
  const token = generateToken();
  await AuthToken.create(
    { user_id: userId, purpose, token_hash: hashToken(token), expires_at: new Date(now.getTime() + ttlMs) },
    { transaction }
  );
  return token;
}

// Marks a link token as used and returns its user id. The update only succeeds while used_at
// is still NULL, so two clicks at the same moment cannot both use the same link.
async function consumeLinkToken(token, purpose, transaction) {
  const row = await AuthToken.findOne({
    where: { token_hash: hashToken(token), purpose, used_at: null, expires_at: { [Op.gt]: new Date() } },
    transaction,
  });
  if (!row) throw new HttpError(400, 'INVALID_OR_EXPIRED_LINK', 'This link is invalid or has expired');
  const [updated] = await AuthToken.update(
    { used_at: new Date() },
    { where: { id: row.id, used_at: null }, transaction }
  );
  if (updated !== 1) throw new HttpError(400, 'INVALID_OR_EXPIRED_LINK', 'This link is invalid or has expired');
  return row.user_id;
}

async function sendVerificationEmail(user, token) {
  const link = `${appUrl()}/verify-email?token=${token}`;
  const { subject, text } = render('verifyEmail', user.preferred_language, { name: user.full_name, link });
  await sendEmail({ to: user.email, subject, text });
}

// Registers a nursery operator (with a nursery profile) or a receiving institution
// (with an institution profile). Both start as "pending" until an administrator approves them.
async function register(data) {
  const email = normaliseEmail(data.email);
  const existing = await User.findOne({ where: { email }, paranoid: false });
  if (existing) throw new HttpError(409, 'EMAIL_TAKEN', 'This email is already registered');

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  let user;
  let token;
  await sequelize.transaction(async (transaction) => {
    user = await User.create(
      {
        role: data.role,
        full_name: data.full_name.trim(),
        email,
        phone: data.phone || null,
        password_hash: passwordHash,
        preferred_language: data.preferred_language || 'en',
      },
      { transaction }
    );

    if (data.role === 'operator') {
      const n = data.nursery;
      const nursery = await Nursery.create(
        {
          owner_id: user.id,
          name: n.name.trim(),
          district: n.district,
          sector: n.sector.trim(),
          address_text: n.address_text || null,
          is_listed: n.is_listed === true,
        },
        { transaction }
      );
      await audit.log({ actorId: user.id, action: 'nursery.registered', entityType: 'nursery', entityId: nursery.id }, { transaction });
    } else {
      const i = data.institution;
      const institution = await Institution.create(
        {
          user_id: user.id,
          org_name: i.org_name.trim(),
          org_type: i.org_type,
          district: i.district,
          sector: i.sector.trim(),
          contact_phone: i.contact_phone || null,
        },
        { transaction }
      );
      await audit.log({ actorId: user.id, action: 'institution.registered', entityType: 'institution', entityId: institution.id }, { transaction });
    }

    await audit.log({ actorId: user.id, action: 'user.registered', entityType: 'user', entityId: user.id }, { transaction });
    token = await createLinkToken(user.id, 'verify_email', VERIFY_EMAIL_TTL_MS, transaction);
  });

  // Sent after the transaction is saved, so an email is never sent for an account that was rolled back.
  await sendVerificationEmail(user, token);
  return toSafeUser(user);
}

async function verifyEmail(token) {
  await sequelize.transaction(async (transaction) => {
    const userId = await consumeLinkToken(token, 'verify_email', transaction);
    await User.update({ email_verified_at: new Date() }, { where: { id: userId, email_verified_at: null }, transaction });
    await audit.log({ actorId: userId, action: 'user.email_verified', entityType: 'user', entityId: userId }, { transaction });
  });
}

// Always finishes quietly, whether or not the email exists (no account enumeration).
async function resendVerification(emailInput) {
  const user = await User.findOne({ where: { email: normaliseEmail(emailInput) } });
  if (!user || user.email_verified_at) return;
  const token = await sequelize.transaction((transaction) =>
    createLinkToken(user.id, 'verify_email', VERIFY_EMAIL_TTL_MS, transaction)
  );
  await sendVerificationEmail(user, token);
}

async function login(emailInput, password) {
  const user = await User.scope('withPassword').findOne({ where: { email: normaliseEmail(emailInput) } });
  const passwordOk = await bcrypt.compare(String(password), user ? user.password_hash : DUMMY_HASH);
  if (!user || !passwordOk) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended');
  if (!user.email_verified_at) throw new HttpError(403, 'EMAIL_NOT_VERIFIED', 'Please confirm your email first');

  await audit.log({ actorId: user.id, action: 'user.login', entityType: 'user', entityId: user.id });
  return { user: toSafeUser(user), sessionToken: signSession(user) };
}

// Always finishes quietly (neutral response, FR17).
async function forgotPassword(emailInput) {
  const user = await User.findOne({ where: { email: normaliseEmail(emailInput) } });
  if (!user || user.status !== 'active') return;
  const token = await sequelize.transaction((transaction) =>
    createLinkToken(user.id, 'reset_password', RESET_PASSWORD_TTL_MS, transaction)
  );
  const link = `${appUrl()}/reset-password?token=${token}`;
  const { subject, text } = render('resetPassword', user.preferred_language, { name: user.full_name, link });
  await sendEmail({ to: user.email, subject, text });
}

// Sets the new password and increases token_version, which signs the user out everywhere (FR17).
async function resetPassword(token, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  let user;
  await sequelize.transaction(async (transaction) => {
    const userId = await consumeLinkToken(token, 'reset_password', transaction);
    user = await User.findByPk(userId, { transaction });
    await user.update(
      { password_hash: passwordHash, token_version: user.token_version + 1 },
      { transaction }
    );
    await audit.log({ actorId: userId, action: 'user.password_reset', entityType: 'user', entityId: userId }, { transaction });
  });
  const { subject, text } = render('passwordChanged', user.preferred_language, { name: user.full_name });
  await sendEmail({ to: user.email, subject, text });
}

module.exports = {
  BCRYPT_ROUNDS,
  SESSION_DAYS,
  toSafeUser,
  signSession,
  verifySession,
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
};

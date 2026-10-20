// AuthService (Figure 7): registration, email confirmation, login and password reset.
// Email confirmation and password reset use 6-digit one-time codes (see otpService.js).
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, User, Nursery, Institution } = require('../models');
const HttpError = require('../utils/httpError');
const audit = require('./auditService');
const otp = require('./otpService');
const { sendNow } = require('./notificationService');
const { render } = require('./emailTemplates');

const BCRYPT_ROUNDS = 10;
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

// Registers a nursery operator (with a nursery profile) or a receiving institution
// (with an institution profile). Both start as "pending" until an administrator approves them.
// Returns the user and what happened to the confirmation email ('sent' | 'failed' | 'skipped').
async function register(data) {
  const email = normaliseEmail(data.email);
  const existing = await User.findOne({ where: { email }, paranoid: false });
  if (existing) throw new HttpError(409, 'EMAIL_TAKEN', 'This email is already registered');

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  let user;
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
  });

  // The code is created and emailed after the account is saved, so a code is never sent for an
  // account that was rolled back.
  const sent = await otp.issueAndSend(user, 'verify_email');
  return { user: toSafeUser(user), emailStatus: sent.status };
}

// Confirms the email with the 6-digit code (FR02).
async function verifyEmail(emailInput, code) {
  const user = await User.findOne({ where: { email: normaliseEmail(emailInput) } });
  if (user?.email_verified_at) throw new HttpError(409, 'ALREADY_VERIFIED', 'This email is already confirmed');
  await otp.verifyCode(user, 'verify_email', code);
  await sequelize.transaction(async (transaction) => {
    await user.update({ email_verified_at: new Date() }, { transaction });
    await audit.log({ actorId: user.id, action: 'user.email_verified', entityType: 'user', entityId: user.id }, { transaction });
  });
}

// "Send the code again". Always answers the same way, whether or not the email exists or the
// account asked too often (no account enumeration); the screen counts down 60 seconds anyway.
async function resendVerification(emailInput) {
  const user = await User.findOne({ where: { email: normaliseEmail(emailInput) } });
  if (!user || user.email_verified_at) return;
  await otp.issueAndSend(user, 'verify_email');
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

// Sends a reset code. Always finishes quietly (neutral response, FR17).
async function forgotPassword(emailInput) {
  const user = await User.findOne({ where: { email: normaliseEmail(emailInput) } });
  if (!user || user.status !== 'active') return;
  await otp.issueAndSend(user, 'reset_password');
}

// Checks the reset code, sets the new password and increases token_version, which signs the user
// out everywhere (FR17). A confirmation email is sent through the outbox.
async function resetPassword(emailInput, code, newPassword) {
  const user = await User.findOne({ where: { email: normaliseEmail(emailInput) } });
  await otp.verifyCode(user, 'reset_password', code);
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await sequelize.transaction(async (transaction) => {
    await User.update(
      { password_hash: passwordHash, token_version: user.token_version + 1 },
      { where: { id: user.id }, transaction }
    );
    await audit.log({ actorId: user.id, action: 'user.password_reset', entityType: 'user', entityId: user.id }, { transaction });
  });
  const message = render('passwordChanged', user.preferred_language, { name: user.full_name });
  await sendNow({ user, type: 'password_changed', eventKey: `password_changed:${user.id}:${Date.now()}`, message });
}

module.exports = {
  BCRYPT_ROUNDS,
  SESSION_DAYS,
  normaliseEmail,
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

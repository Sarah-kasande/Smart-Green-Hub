// Session handling. The login JWT lives in an HttpOnly cookie, which JavaScript in the
// browser cannot read, so a script injected into the page cannot steal it (NFR02).
const { User } = require('../models');
const HttpError = require('../utils/httpError');
const { isProduction } = require('../config/env');
const { verifySession, SESSION_DAYS } = require('../services/authService');

const SESSION_COOKIE = 'sgh_session';

// secure: only sent over HTTPS in production.
// sameSite 'lax': not sent with cross-site form posts (first line of CSRF defence).
function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

function clearSessionCookie(res) {
  const { maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
}

// Runs on every request: if a valid session cookie is present, puts the user on req.user.
// A cookie is rejected when the account is suspended or archived, or when its token_version
// is older than the user's (the password was reset after this cookie was issued).
async function loadUser(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();
  try {
    const payload = verifySession(token);
    const user = await User.findByPk(payload.sub);
    if (!user || user.status !== 'active' || user.token_version !== payload.tv) {
      clearSessionCookie(res);
      return next();
    }
    req.user = user;
    return next();
  } catch (error) {
    // Expired or tampered cookie: treat as signed out.
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      clearSessionCookie(res);
      return next();
    }
    return next(error);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'NOT_AUTHENTICATED', 'Please sign in'));
  return next();
}

// Server-side role check, e.g. requireRole('admin'). Always use after requireAuth.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'NOT_AUTHENTICATED', 'Please sign in'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'FORBIDDEN', 'You do not have access to this'));
    return next();
  };
}

module.exports = { SESSION_COOKIE, setSessionCookie, clearSessionCookie, loadUser, requireAuth, requireRole };

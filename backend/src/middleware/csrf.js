// CSRF protection with the "double-submit cookie" pattern (NFR02).
//
// 1. The server gives the browser a random token in a cookie that JavaScript CAN read (sgh_csrf).
// 2. For every request that changes something (POST, PUT, PATCH, DELETE) our frontend copies that
//    token into the X-CSRF-Token header. Axios does this automatically (see frontend/src/api/client.js).
// 3. The server checks that header and cookie match.
//
// Another website can make the browser SEND our cookies, but it cannot READ them,
// so it cannot put the right value in the header. Its request is refused.
const { generateToken, safeEqual } = require('../utils/tokens');
const HttpError = require('../utils/httpError');
const { isProduction } = require('../config/env');

const CSRF_COOKIE = 'sgh_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function issueCsrfCookie(req, res, next) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = generateToken();
    res.cookie(CSRF_COOKIE, token, { httpOnly: false, secure: isProduction, sameSite: 'lax', path: '/' });
    req.cookies = { ...req.cookies, [CSRF_COOKIE]: token };
  }
  next();
}

function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(new HttpError(403, 'CSRF_FAILED', 'Security check failed. Please reload the page and try again.'));
  }
  return next();
}

module.exports = { CSRF_COOKIE, CSRF_HEADER, issueCsrfCookie, verifyCsrf };

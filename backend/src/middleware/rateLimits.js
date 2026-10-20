// Rate limits for sensitive routes (NFR02): login, password reset, registration and uploads.
// Counted per IP address. Turned off in automated tests so tests can log in many times.
const rateLimit = require('express-rate-limit');
const { isTest } = require('../config/env');

function limiter({ windowMinutes, limit }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    handler: (req, res) => {
      res.status(429).json({ code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please wait and try again.' });
    },
  });
}

module.exports = {
  // Every API call: generous, only stops runaway scripts (about 2 requests per second for 5 minutes)
  apiLimiter: limiter({ windowMinutes: 5, limit: 600 }),
  loginLimiter: limiter({ windowMinutes: 15, limit: 10 }),
  emailLinkLimiter: limiter({ windowMinutes: 15, limit: 5 }),
  registerLimiter: limiter({ windowMinutes: 60, limit: 10 }),
  uploadLimiter: limiter({ windowMinutes: 60, limit: 30 }),
};

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
    // Off in automated tests, except in the tests that check the limits (TEST_RATE_LIMITS=on)
    skip: () => isTest && process.env.TEST_RATE_LIMITS !== 'on',
    handler: (req, res) => {
      res.status(429).json({ code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please wait and try again.' });
    },
  });
}

module.exports = {
  // Every API call: generous, only stops runaway scripts (about 2 requests per second for 5 minutes)
  apiLimiter: limiter({ windowMinutes: 5, limit: 600 }),
  loginLimiter: limiter({ windowMinutes: 15, limit: 10 }),
  // 'Send the code again' and 'forgot password' (the account itself is limited to 1 per 60 s)
  emailLinkLimiter: limiter({ windowMinutes: 15, limit: 5 }),
  // Typing a code: each code allows 5 wrong tries; this stops trying many accounts from one IP
  codeLimiter: limiter({ windowMinutes: 15, limit: 20 }),
  registerLimiter: limiter({ windowMinutes: 60, limit: 10 }),
  uploadLimiter: limiter({ windowMinutes: 60, limit: 30 }),
};

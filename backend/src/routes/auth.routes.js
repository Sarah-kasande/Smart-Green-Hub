const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { setSessionCookie, clearSessionCookie } = require('../middleware/auth');
const { loginLimiter, emailLinkLimiter, registerLimiter, codeLimiter } = require('../middleware/rateLimits');
const { RESEND_COOLDOWN_SECONDS } = require('../services/otpService');
const authService = require('../services/authService');
const verificationService = require('../services/verificationService');
const v = require('./validators');
const { REGISTRABLE_ROLES } = require('../utils/constants');

const router = express.Router();

// Who is signed in? Answers { user: null } when nobody is (not an error).
router.get('/me', async (req, res, next) => {
  try {
    if (!req.user) return res.json({ user: null, organisation: null });
    const org = await verificationService.findOwnOrganisation(req.user);
    res.json({
      user: authService.toSafeUser(req.user),
      organisation: org ? verificationService.toOwnOrganisation(org) : null,
    });
  } catch (error) {
    next(error);
  }
});

const isOperator = body('role').equals('operator');
const isInstitution = body('role').equals('institution');

router.post(
  '/register',
  registerLimiter,
  [
    // Only operator or institution: nobody can register as an administrator (FR02).
    body('role').isIn(REGISTRABLE_ROLES).withMessage('invalid_choice'),
    v.requiredText('full_name', 120),
    v.email(),
    v.phone('phone'),
    v.password(),
    v.language('preferred_language'),
    v.requiredText('nursery.name', 160, isOperator),
    v.district('nursery.district', isOperator),
    v.requiredText('nursery.sector', 60, isOperator),
    v.optionalText('nursery.address_text', 255, isOperator),
    body('nursery.is_listed').if(isOperator).optional().isBoolean({ strict: true }).withMessage('invalid'),
    v.requiredText('institution.org_name', 160, isInstitution),
    v.orgType('institution.org_type', isInstitution),
    v.district('institution.district', isInstitution),
    v.requiredText('institution.sector', 60, isInstitution),
    v.phone('institution.contact_phone', isInstitution),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { user, emailStatus } = await authService.register(req.body);
      // email_status tells the person whether their code email left (sent), failed, or was only
      // printed on the server (skipped, development). It concerns their own new account only.
      res.status(201).json({ user, email_status: emailStatus, resend_after_seconds: RESEND_COOLDOWN_SECONDS });
    } catch (error) {
      next(error);
    }
  }
);

// Confirm the email with the 6-digit code (FR02). Wrong tries are limited per code (5) and per IP.
router.post('/verify-email', codeLimiter, [v.email(), v.code()], validate, async (req, res, next) => {
  try {
    await authService.verifyEmail(req.body.email, req.body.code);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// 'Send the code again'. Neutral answer whether or not the email exists or the account asked too
// often (at most one code per 60 s and 10 per day per account; also limited per IP).
router.post('/resend-verification', emailLinkLimiter, [v.email()], validate, async (req, res, next) => {
  try {
    await authService.resendVerification(req.body.email);
    res.json({ ok: true, resend_after_seconds: RESEND_COOLDOWN_SECONDS });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/login',
  loginLimiter,
  [v.email(), body('password').isString().notEmpty().withMessage('required')],
  validate,
  async (req, res, next) => {
    try {
      const { user, sessionToken } = await authService.login(req.body.email, req.body.password);
      setSessionCookie(res, sessionToken);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// Neutral answer whether or not the email exists (FR17).
router.post('/forgot-password', emailLinkLimiter, [v.email()], validate, async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    res.json({ ok: true, resend_after_seconds: RESEND_COOLDOWN_SECONDS });
  } catch (error) {
    next(error);
  }
});

// Reset with the 6-digit code from the email (FR17)
router.post('/reset-password', codeLimiter, [v.email(), v.code(), v.password()], validate, async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.email, req.body.code, req.body.password);
    // This browser is signed out too; the user signs in again with the new password.
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

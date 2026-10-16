const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { setSessionCookie, clearSessionCookie } = require('../middleware/auth');
const { loginLimiter, emailLinkLimiter, registerLimiter } = require('../middleware/rateLimits');
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
      const user = await authService.register(req.body);
      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/verify-email', [v.token()], validate, async (req, res, next) => {
  try {
    await authService.verifyEmail(req.body.token);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Neutral answer whether or not the email exists.
router.post('/resend-verification', emailLinkLimiter, [v.email()], validate, async (req, res, next) => {
  try {
    await authService.resendVerification(req.body.email);
    res.json({ ok: true });
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
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', emailLinkLimiter, [v.token(), v.password()], validate, async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    // This browser is signed out too; the user signs in again with the new password.
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

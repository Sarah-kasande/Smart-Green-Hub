// The signed-in user's own account, organisation details and documents.
const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const authService = require('../services/authService');
const verificationService = require('../services/verificationService');
const audit = require('../services/auditService');
const v = require('./validators');

const router = express.Router();
router.use(requireAuth);

// Update name, phone or language (FR18: each user chooses their language).
router.patch(
  '/',
  [v.optionalText('full_name', 120), body('full_name').optional().notEmpty().withMessage('required'), v.phone('phone'), v.language('preferred_language')],
  validate,
  async (req, res, next) => {
    try {
      const changes = {};
      for (const field of ['full_name', 'phone', 'preferred_language']) {
        if (req.body[field] !== undefined) changes[field] = req.body[field] || null;
      }
      await req.user.update(changes);
      await audit.log({ actorId: req.user.id, action: 'user.updated', entityType: 'user', entityId: req.user.id });
      res.json({ user: authService.toSafeUser(req.user) });
    } catch (error) {
      next(error);
    }
  }
);

// Edit nursery or institution details. A rejected item is sent back for review.
router.put(
  '/organisation',
  requireRole('operator', 'institution'),
  [
    v.requiredText('name', 160),
    v.district('district'),
    v.requiredText('sector', 60),
    v.optionalText('address_text', 255),
    body('is_listed').optional().isBoolean({ strict: true }).withMessage('invalid'),
    v.orgType('org_type', (value, { req }) => req.user.role === 'institution'),
    v.phone('contact_phone'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const organisation = await verificationService.updateOwnOrganisation(req.user, req.body);
      res.json({ organisation });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/documents', requireRole('operator', 'institution'), async (req, res, next) => {
  try {
    const org = await verificationService.findOwnOrganisation(req.user);
    const documents = org ? await verificationService.documentsFor(org.type, org.row.id) : [];
    res.json({ documents });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

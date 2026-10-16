// Administrator routes. Every route here requires the admin role (checked on the server).
const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const verificationService = require('../services/verificationService');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const TYPES = ['nursery', 'institution'];

router.get(
  '/verifications',
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'all']).withMessage('invalid_choice'),
    query('type').optional().isIn([...TYPES, 'all']).withMessage('invalid_choice'),
  ],
  validate,
  async (req, res, next) => {
    try {
      res.json(await verificationService.list({ status: req.query.status, type: req.query.type }));
    } catch (error) {
      next(error);
    }
  }
);

const itemParams = [
  param('type').isIn(TYPES).withMessage('invalid_choice'),
  param('id').isInt({ min: 1 }).withMessage('invalid'),
];

router.get('/verifications/:type/:id', itemParams, validate, async (req, res, next) => {
  try {
    res.json({ item: await verificationService.getOne(req.params.type, Number(req.params.id)) });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/verifications/:type/:id/decision',
  [
    ...itemParams,
    body('decision').isIn(['approve', 'reject']).withMessage('invalid_choice'),
    // A reason is required when rejecting, so the owner knows what to correct.
    body('reason')
      .if(body('decision').equals('reject'))
      .isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 500 }).withMessage('too_long'),
    body('reason').optional({ values: 'null' }).isString().trim().isLength({ max: 500 }).withMessage('too_long'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const item = await verificationService.decide({
        adminId: req.user.id,
        type: req.params.type,
        id: Number(req.params.id),
        decision: req.body.decision,
        reason: req.body.reason || null,
      });
      res.json({ item });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

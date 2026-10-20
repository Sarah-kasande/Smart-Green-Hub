// Administrator routes. Every route here requires the admin role (checked on the server).
const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const verificationService = require('../services/verificationService');
const admin = require('../services/adminService');
const risk = require('../services/riskService');
const surplus = require('../services/surplusService');
const impact = require('../services/impactService');
const { dispatchPending } = require('../services/notificationService');
const { SPECIES_CATEGORIES, LISTING_STATUSES } = require('../utils/constants');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));
const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const TYPES = ['nursery', 'institution'];

// ---- Dashboard (FR15) ----
router.get('/dashboard', handle(async (req, res) => res.json(await admin.dashboard())));

// ---- Verification queue (FR02) ----
router.get(
  '/verifications',
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'all']).withMessage('invalid_choice'),
    query('type').optional().isIn([...TYPES, 'all']).withMessage('invalid_choice'),
  ],
  validate,
  handle(async (req, res) => res.json(await verificationService.list({ status: req.query.status, type: req.query.type })))
);

const itemParams = [param('type').isIn(TYPES).withMessage('invalid_choice'), param('id').isInt({ min: 1 }).withMessage('invalid')];

router.get('/verifications/:type/:id', itemParams, validate, handle(async (req, res) => {
  res.json({ item: await verificationService.getOne(req.params.type, Number(req.params.id)) });
}));

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
  handle(async (req, res) => {
    const item = await verificationService.decide({
      adminId: req.user.id,
      type: req.params.type,
      id: Number(req.params.id),
      decision: req.body.decision,
      reason: req.body.reason || null,
    });
    res.json({ item });
  })
);

// ---- Rules (Table 5 thresholds, FR15) ----
router.get('/rules', handle(async (req, res) => res.json({ rules: await admin.getRules() })));
router.put(
  '/rules',
  [
    body('sales_lookback_days').isInt({ min: 1, max: 365 }).withMessage('invalid').toInt(),
    body('medium_risk_ratio').isFloat({ min: 0.01, max: 0.99 }).withMessage('invalid').toFloat(),
    body('high_risk_ratio').isFloat({ min: 0.02, max: 1 }).withMessage('invalid').toFloat(),
    body('safety_margin').isFloat({ min: 0, max: 1 }).withMessage('invalid').toFloat(),
    body('far_days').isInt({ min: 2, max: 365 }).withMessage('invalid').toInt(),
    body('near_days').isInt({ min: 1, max: 364 }).withMessage('invalid').toInt(),
  ],
  validate,
  handle(async (req, res) => res.json({ rules: await admin.updateRules(req.user, req.body) }))
);

// ---- Species (FR15) ----
const speciesRules = [
  body('common_name').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 120 }).withMessage('too_long'),
  body('kinyarwanda_name').optional({ values: 'null' }).isString().isLength({ max: 120 }).withMessage('too_long'),
  body('category').isIn(SPECIES_CATEGORIES).withMessage('invalid_choice'),
  body('default_days_to_ready').isInt({ min: 1, max: 3650 }).withMessage('invalid').toInt(),
  body('default_prime_days').isInt({ min: 1, max: 3650 }).withMessage('invalid').toInt(),
  body('prime_window_override').optional({ values: 'null' }).custom((v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 3650)).withMessage('invalid'),
];
const speciesId = param('id').isInt({ min: 1 }).withMessage('invalid').toInt();

router.get('/species', [query('archived').optional().isIn(['true', 'false'])], validate, handle(async (req, res) => {
  res.json({ species: await admin.listSpecies({ includeArchived: req.query.archived === 'true' }) });
}));
router.post('/species', speciesRules, validate, handle(async (req, res) => res.status(201).json({ species: await admin.saveSpecies(req.user, req.body) })));
router.put('/species/:id', [speciesId, ...speciesRules], validate, handle(async (req, res) => res.json({ species: await admin.saveSpecies(req.user, req.body, req.params.id) })));
router.delete('/species/:id', [speciesId, body('reason').optional().isString().isLength({ max: 500 })], validate, handle(async (req, res) => {
  await admin.archiveSpecies(req.user, req.params.id, req.body?.reason || null);
  res.json({ ok: true });
}));
router.post('/species/:id/restore', [speciesId], validate, handle(async (req, res) => {
  await admin.restoreSpecies(req.user, req.params.id);
  res.json({ ok: true });
}));

// ---- Audit log (FR16) ----
router.get(
  '/audit',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('entity_type').optional({ values: 'falsy' }).isString().isLength({ max: 60 }),
    query('action').optional({ values: 'falsy' }).isString().isLength({ max: 60 }),
    query('from').optional({ values: 'falsy' }).isISO8601({ strict: true }),
    query('to').optional({ values: 'falsy' }).isISO8601({ strict: true }),
  ],
  validate,
  handle(async (req, res) => {
    res.json(await admin.auditLog({ entityType: req.query.entity_type, action: req.query.action, from: req.query.from, to: req.query.to, page: req.query.page || 1 }));
  })
);

// ---- Listing moderation (FR15) ----
router.get('/listings', [query('status').optional().isIn([...LISTING_STATUSES, 'all'])], validate, handle(async (req, res) => {
  res.json({ listings: await admin.listListings({ status: req.query.status }) });
}));
router.post(
  '/listings/:id/withdraw',
  [param('id').isInt({ min: 1 }).toInt(), body('reason').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 500 })],
  validate,
  handle(async (req, res) => {
    await surplus.withdrawListing({ user: req.user, listingId: req.params.id, reason: req.body.reason });
    res.json({ ok: true });
  })
);

// ---- Risk job on demand for every nursery ----
router.post('/risk/run', handle(async (req, res) => {
  const expired = await surplus.expireListings();
  res.json({ expired_listings: expired, summary: await risk.runEvaluation({ actorId: req.user.id }) });
}));

// ---- Impact (FR12: detailed for the administrator) ----
router.get('/impact', handle(async (req, res) => res.json({ summary: await impact.summary(), records: await impact.records() })));

// ---- Notification failures (FR14) ----
router.get('/notifications/failed', handle(async (req, res) => res.json({ notifications: await admin.failedNotifications() })));
router.post('/notifications/:id/retry', [param('id').isInt({ min: 1 }).toInt()], validate, handle(async (req, res) => {
  await admin.retryNotification(req.user, req.params.id);
  res.json({ result: await dispatchPending() });
}));

module.exports = router;

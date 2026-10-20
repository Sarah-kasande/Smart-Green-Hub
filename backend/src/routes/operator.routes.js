// Nursery operator API: batches, sales, expenses, finance, sync, alerts, planting,
// Surplus Board listings, requests and impact. Mounted at /api/operator.
// Every route needs a signed-in operator whose nursery is approved (FR02).
const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { loadNursery, requireApprovedNursery } = require('../middleware/organisation');
const inventory = require('../services/inventoryService');
const finance = require('../services/financeService');
const sync = require('../services/syncService');
const risk = require('../services/riskService');
const planning = require('../services/planningService');
const surplus = require('../services/surplusService');
const impact = require('../services/impactService');
const { operatorDashboard } = require('../services/dashboardService');
const { BATCH_STAGES, OFFER_TYPES, ALERT_STATUSES, REQUEST_STATUSES } = require('../utils/constants');

const router = express.Router();
router.use(requireAuth, requireRole('operator'), loadNursery, requireApprovedNursery);

// Small helper so every route handler can be an async function without try/catch everywhere
const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const id = (name = 'id') => param(name).isInt({ min: 1 }).withMessage('invalid').toInt();
const date = (field) => body(field).isISO8601({ strict: true }).withMessage('invalid_date').isLength({ min: 10, max: 10 }).withMessage('invalid_date');
const optionalDate = (field) => body(field).optional({ values: 'falsy' }).isISO8601({ strict: true }).withMessage('invalid_date').isLength({ min: 10, max: 10 }).withMessage('invalid_date');
const uuid = () => body('client_uuid').optional({ values: 'falsy' }).isUUID().withMessage('invalid');
const money = (field) => body(field).isInt({ min: 0, max: 1000000000 }).withMessage('invalid_amount').toInt();
const queryDate = (field) => query(field).optional({ values: 'falsy' }).isISO8601({ strict: true }).withMessage('invalid_date');

// ---- Dashboard ----
router.get('/dashboard', handle(async (req, res) => res.json(await operatorDashboard(req.nursery))));

// ---- Batches (FR04) ----
const batchRules = [
  body('species_id').isInt({ min: 1 }).withMessage('required').toInt(),
  body('quantity').isInt({ min: 1, max: 10000000 }).withMessage('invalid_quantity').toInt(),
  date('planting_date'),
  money('unit_price'),
  body('days_to_ready').optional({ values: 'falsy' }).isInt({ min: 1, max: 3650 }).withMessage('invalid').toInt(),
  body('prime_days').optional({ values: 'falsy' }).isInt({ min: 1, max: 3650 }).withMessage('invalid').toInt(),
  body('stage').optional({ values: 'falsy' }).isIn(BATCH_STAGES).withMessage('invalid_choice'),
  uuid(),
];

router.get('/batches', [query('stage').optional().isIn([...BATCH_STAGES, 'all'])], validate, handle(async (req, res) => {
  const stage = req.query.stage === 'all' ? undefined : req.query.stage;
  res.json({ batches: await inventory.listBatches(req.nursery, { stage, includeCleared: req.query.stage === 'all' }) });
}));

router.post('/batches', batchRules, validate, handle(async (req, res) => {
  const { batch, duplicate } = await inventory.createBatch(req.nursery, req.user, req.body);
  res.status(duplicate ? 200 : 201).json({ batch: inventory.toBatchJson(batch), duplicate });
}));

router.get('/batches/:id', [id()], validate, handle(async (req, res) => {
  const history = await inventory.batchHistory(req.nursery, req.params.id);
  const sales = await finance.listSales(req.nursery, { batchId: req.params.id });
  res.json({ ...history, sales });
}));

router.patch(
  '/batches/:id',
  [
    id(),
    body('stage').optional().isIn(BATCH_STAGES).withMessage('invalid_choice'),
    body('unit_price').optional().isInt({ min: 0, max: 1000000000 }).withMessage('invalid_amount').toInt(),
    optionalDate('expected_ready_date'),
    optionalDate('prime_end_date'),
  ],
  validate,
  handle(async (req, res) => {
    const batch = await inventory.updateBatch(req.nursery, req.user, req.params.id, req.body);
    res.json({ batch: inventory.toBatchJson(batch) });
  })
);

router.delete('/batches/:id', [id(), body('reason').optional().isString().isLength({ max: 500 })], validate, handle(async (req, res) => {
  await inventory.archiveBatch(req.nursery, req.user, req.params.id, req.body?.reason || null);
  res.json({ ok: true });
}));

const adjustmentRules = [
  body('quantity_change').isInt({ min: -10000000, max: 10000000 }).withMessage('invalid_quantity').custom((v) => Number(v) !== 0).withMessage('invalid_quantity').toInt(),
  body('reason').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 255 }).withMessage('too_long'),
  uuid(),
];
router.post('/batches/:id/adjustments', [id(), ...adjustmentRules], validate, handle(async (req, res) => {
  const { adjustment, duplicate } = await inventory.adjustStock(req.nursery, req.user, { ...req.body, batch_id: req.params.id });
  res.status(duplicate ? 200 : 201).json({ adjustment, duplicate });
}));

// ---- Sales and expenses (FR05) ----
const saleRules = [
  body('batch_id').isInt({ min: 1 }).withMessage('required').toInt(),
  body('quantity').isInt({ min: 1, max: 10000000 }).withMessage('invalid_quantity').toInt(),
  body('unit_price').optional({ values: 'null' }).isInt({ min: 0, max: 1000000000 }).withMessage('invalid_amount').toInt(),
  body('sold_at').optional({ values: 'falsy' }).isISO8601().withMessage('invalid_date'),
  body('customer_note').optional({ values: 'null' }).isString().isLength({ max: 255 }).withMessage('too_long'),
  uuid(),
];
router.get('/sales', [queryDate('from'), queryDate('to'), query('batch_id').optional().isInt()], validate, handle(async (req, res) => {
  res.json({ sales: await finance.listSales(req.nursery, { from: req.query.from, to: req.query.to, batchId: req.query.batch_id }) });
}));
router.post('/sales', saleRules, validate, handle(async (req, res) => {
  const { sale, duplicate } = await finance.recordSale(req.nursery, req.user, req.body);
  res.status(duplicate ? 200 : 201).json({ sale, duplicate });
}));
router.delete('/sales/:id', [id(), body('reason').optional().isString().isLength({ max: 500 })], validate, handle(async (req, res) => {
  await finance.archiveSale(req.nursery, req.user, req.params.id, req.body?.reason || null);
  res.json({ ok: true });
}));

const expenseRules = [
  body('category').isIn(finance.EXPENSE_CATEGORIES).withMessage('invalid_choice'),
  body('amount').isInt({ min: 1, max: 1000000000 }).withMessage('invalid_amount').toInt(),
  optionalDate('spent_at'),
  body('note').optional({ values: 'null' }).isString().isLength({ max: 255 }).withMessage('too_long'),
  uuid(),
];
router.get('/expenses', [queryDate('from'), queryDate('to')], validate, handle(async (req, res) => {
  res.json({ expenses: await finance.listExpenses(req.nursery, { from: req.query.from, to: req.query.to }), categories: finance.EXPENSE_CATEGORIES });
}));
router.post('/expenses', expenseRules, validate, handle(async (req, res) => {
  const { expense, duplicate } = await finance.recordExpense(req.nursery, req.user, req.body);
  res.status(duplicate ? 200 : 201).json({ expense, duplicate });
}));
router.delete('/expenses/:id', [id(), body('reason').optional().isString().isLength({ max: 500 })], validate, handle(async (req, res) => {
  await finance.archiveExpense(req.nursery, req.user, req.params.id, req.body?.reason || null);
  res.json({ ok: true });
}));

router.get('/finance', [queryDate('from'), queryDate('to')], validate, handle(async (req, res) => {
  res.json(await finance.profitLoss(req.nursery, { from: req.query.from, to: req.query.to }));
}));

// ---- Offline sync (FR13) ----
// Each change is validated by the same service that handles online requests.
router.post(
  '/sync',
  [
    body('changes').isArray({ max: 500 }).withMessage('invalid'),
    body('changes.*.client_uuid').isUUID().withMessage('invalid'),
    body('changes.*.type').isIn(['batch', 'sale', 'expense', 'stock_adjustment']).withMessage('invalid_choice'),
    body('changes.*.data').isObject().withMessage('invalid'),
  ],
  validate,
  handle(async (req, res) => res.json(await sync.applyChanges(req.nursery, req.user, req.body.changes)))
);
router.get('/sync', handle(async (req, res) => res.json({ server_changes: await sync.serverChanges(req.nursery), server_time: new Date().toISOString() })));

// ---- Alerts (FR06, FR07) ----
router.get('/alerts', [query('status').optional().isIn([...ALERT_STATUSES, 'all'])], validate, handle(async (req, res) => {
  res.json({ alerts: await risk.listAlerts(req.nursery, { status: req.query.status || 'all' }) });
}));
router.patch(
  '/alerts/:id',
  [id(), body('status').isIn(['acknowledged', 'resolved', 'dismissed']).withMessage('invalid_choice'), body('note').optional({ values: 'null' }).isString().isLength({ max: 500 })],
  validate,
  handle(async (req, res) => res.json({ alert: await risk.changeAlertStatus(req.nursery, req.user, req.params.id, req.body.status, req.body.note) }))
);
// "Check now": evaluate this nursery's batches immediately (FR06 "on demand")
router.post('/alerts/evaluate', handle(async (req, res) => {
  res.json({ summary: await risk.runEvaluation({ nurseryId: req.nursery.id, actorId: req.user.id }) });
}));

// ---- Planting recommendations (FR08) ----
router.get('/planting', handle(async (req, res) => res.json({ recommendations: await planning.listRecommendations(req.nursery) })));
router.post('/planting/:speciesId', [id('speciesId'), body('status').isIn(['accepted', 'dismissed']).withMessage('invalid_choice')], validate, handle(async (req, res) => {
  res.status(201).json({ recommendation: await planning.saveDecision(req.nursery, req.user, req.params.speciesId, req.body.status) });
}));

// ---- Surplus listings (FR09) ----
router.get('/listings', handle(async (req, res) => res.json({ listings: await surplus.listOwnListings(req.nursery) })));
router.post(
  '/listings',
  [
    body('batch_id').isInt({ min: 1 }).withMessage('required').toInt(),
    body('quantity').isInt({ min: 1, max: 10000000 }).withMessage('invalid_quantity').toInt(),
    body('offer_type').isIn(OFFER_TYPES).withMessage('invalid_choice'),
    body('discounted_price').if(body('offer_type').equals('discounted')).isInt({ min: 1, max: 1000000000 }).withMessage('invalid_amount').toInt(),
    body('pickup_note').optional({ values: 'null' }).isString().isLength({ max: 255 }).withMessage('too_long'),
    optionalDate('available_from'),
    date('expires_at'),
  ],
  validate,
  handle(async (req, res) => {
    const listing = await surplus.createListing(req.nursery, req.user, req.body);
    res.status(201).json({ listing });
  })
);
router.post('/listings/:id/withdraw', [id(), body('reason').optional({ values: 'null' }).isString().isLength({ max: 500 })], validate, handle(async (req, res) => {
  await surplus.withdrawListing({ nursery: req.nursery, user: req.user, listingId: req.params.id, reason: req.body.reason });
  res.json({ ok: true });
}));

// ---- Requests for this nursery's listings (FR11) ----
router.get('/requests', [query('status').optional().isIn([...REQUEST_STATUSES, 'all'])], validate, handle(async (req, res) => {
  res.json({ requests: await surplus.listRequestsForNursery(req.nursery, { status: req.query.status }) });
}));
router.post(
  '/requests/:id/decision',
  [id(), body('decision').isIn(['approve', 'decline']).withMessage('invalid_choice'), body('reason').optional({ values: 'null' }).isString().isLength({ max: 500 }).withMessage('too_long')],
  validate,
  handle(async (req, res) => {
    await surplus.decideRequest(req.nursery, req.user, req.params.id, req.body.decision, req.body.reason);
    res.json({ ok: true });
  })
);
router.post(
  '/requests/:id/confirm',
  [id(), body('land_cleared_sqm').optional({ values: 'null' }).isFloat({ min: 0, max: 10000000 }).withMessage('invalid_amount').toFloat()],
  validate,
  handle(async (req, res) => {
    res.json(await surplus.confirmHandover({ side: 'nursery', nursery: req.nursery, user: req.user, requestId: req.params.id, details: req.body }));
  })
);

// ---- Impact (FR12) ----
router.get('/impact', handle(async (req, res) => {
  res.json({ summary: await impact.summary({ nurseryId: req.nursery.id }), records: await impact.records({ nurseryId: req.nursery.id }) });
}));

module.exports = router;

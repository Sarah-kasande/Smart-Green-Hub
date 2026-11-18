// Receiving institution API. Mounted at /api/institution.
// Every route needs a signed-in institution that the administrator approved (FR02, FR10).
const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { loadInstitution, requireApprovedInstitution } = require('../middleware/organisation');
const surplus = require('../services/surplusService');
const impact = require('../services/impactService');
const availablePlants = require('../services/availablePlantsService');
const { institutionDashboard } = require('../services/dashboardService');
const { REQUEST_STATUSES, KIGALI_DISTRICTS, SPECIES_CATEGORIES } = require('../utils/constants');

const router = express.Router();
router.use(requireAuth, requireRole('institution'), loadInstitution, requireApprovedInstitution);

const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const id = () => param('id').isInt({ min: 1 }).withMessage('invalid').toInt();

router.get('/dashboard', handle(async (req, res) => res.json(await institutionDashboard(req.institution))));

router.get('/requests', [query('status').optional().isIn([...REQUEST_STATUSES, 'all'])], validate, handle(async (req, res) => {
  res.json({ requests: await surplus.listRequestsForInstitution(req.institution, { status: req.query.status }) });
}));

// The same request details for a surplus offer and for available plants
const requestRules = [
  id(),
  body('quantity').isInt({ min: 1, max: 10000000 }).withMessage('invalid_quantity').toInt(),
  body('purpose').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 255 }).withMessage('too_long'),
  body('preferred_pickup_date').optional({ values: 'falsy' }).isISO8601({ strict: true }).withMessage('invalid_date').isLength({ min: 10, max: 10 }).withMessage('invalid_date'),
  body('message').optional({ values: 'null' }).isString().trim().isLength({ max: 500 }).withMessage('too_long'),
];
const requestData = (b) => ({ quantity: b.quantity, purpose: b.purpose, preferred_pickup_date: b.preferred_pickup_date || null, message: b.message || null });

// Request plants from a surplus listing with a planting purpose (FR10)
router.post('/listings/:id/requests', requestRules, validate, handle(async (req, res) => {
  const { request, duplicate } = await surplus.requestPlants(req.institution, req.user, { listingId: req.params.id }, requestData(req.body));
  res.status(duplicate ? 200 : 201).json({ request, duplicate });
}));

// ---- Available plants (W42): ready plants nurseries can supply, request-and-approve only ----
router.get(
  '/available-plants',
  [
    query('district').optional({ values: 'falsy' }).isIn(KIGALI_DISTRICTS),
    query('category').optional({ values: 'falsy' }).isIn(SPECIES_CATEGORIES),
    query('species_id').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
    query('min_quantity').optional({ values: 'falsy' }).isInt({ min: 1, max: 10000000 }).toInt(),
  ],
  validate,
  handle(async (req, res) => {
    const plants = await availablePlants.list({ district: req.query.district, category: req.query.category, speciesId: req.query.species_id, minQuantity: req.query.min_quantity });
    res.json({ plants });
  })
);
router.post('/available-plants/:id/requests', requestRules, validate, handle(async (req, res) => {
  const { request, duplicate } = await surplus.requestPlants(req.institution, req.user, { batchId: req.params.id }, requestData(req.body));
  res.status(duplicate ? 200 : 201).json({ request, duplicate });
}));

router.post('/requests/:id/cancel', [id(), body('reason').optional({ values: 'null' }).isString().isLength({ max: 500 })], validate, handle(async (req, res) => {
  await surplus.cancelRequest(req.institution, req.user, req.params.id, req.body.reason);
  res.json({ ok: true });
}));

// Confirm that the plants were received, with the planting site (FR11, FR12)
router.post(
  '/requests/:id/confirm',
  [
    id(),
    body('planting_site').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 255 }).withMessage('too_long'),
    body('planting_district').optional({ values: 'falsy' }).isIn(KIGALI_DISTRICTS).withMessage('invalid_choice'),
  ],
  validate,
  handle(async (req, res) => {
    res.json(await surplus.confirmHandover({ side: 'institution', institution: req.institution, user: req.user, requestId: req.params.id, details: req.body }));
  })
);

router.get('/impact', handle(async (req, res) => {
  res.json({ summary: await impact.summary({ institutionId: req.institution.id }), records: await impact.records({ institutionId: req.institution.id }) });
}));

module.exports = router;

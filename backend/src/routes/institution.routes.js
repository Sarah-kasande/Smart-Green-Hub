// Receiving institution API. Mounted at /api/institution.
// Every route needs a signed-in institution that the administrator approved (FR02, FR10).
const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { loadInstitution, requireApprovedInstitution } = require('../middleware/organisation');
const surplus = require('../services/surplusService');
const impact = require('../services/impactService');
const { institutionDashboard } = require('../services/dashboardService');
const { REQUEST_STATUSES, KIGALI_DISTRICTS } = require('../utils/constants');

const router = express.Router();
router.use(requireAuth, requireRole('institution'), loadInstitution, requireApprovedInstitution);

const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const id = () => param('id').isInt({ min: 1 }).withMessage('invalid').toInt();

router.get('/dashboard', handle(async (req, res) => res.json(await institutionDashboard(req.institution))));

router.get('/requests', [query('status').optional().isIn([...REQUEST_STATUSES, 'all'])], validate, handle(async (req, res) => {
  res.json({ requests: await surplus.listRequestsForInstitution(req.institution, { status: req.query.status }) });
}));

// Request plants from a listing with a planting purpose (FR10)
router.post(
  '/listings/:id/requests',
  [
    id(),
    body('quantity').isInt({ min: 1, max: 10000000 }).withMessage('invalid_quantity').toInt(),
    body('purpose').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 255 }).withMessage('too_long'),
  ],
  validate,
  handle(async (req, res) => {
    const { request, duplicate } = await surplus.requestPlants(req.institution, req.user, req.params.id, req.body);
    res.status(duplicate ? 200 : 201).json({ request, duplicate });
  })
);

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

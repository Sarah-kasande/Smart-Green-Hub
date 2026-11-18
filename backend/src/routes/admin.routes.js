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
const speciesService = require('../services/speciesService');
const salesReport = require('../services/salesReportService');
const auditService = require('../services/auditService');
const records = require('../services/adminRecordsService');
const support = require('../services/supportService');
const v = require('./validators');
const { SPECIES_CATEGORIES, SPECIES_STATUSES, LISTING_STATUSES, BATCH_STAGES, KIGALI_DISTRICTS, ORG_TYPES, SUPPORT_CATEGORIES, SUPPORT_STATUSES } = require('../utils/constants');

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
  res.json({ species: await admin.listSpecies({ includeArchived: req.query.archived === 'true' }), pending_requests: await speciesService.pendingCount() });
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

// ---- Species requests from nurseries (docs/DEVIATIONS.md W39) ----
const requestId = param('id').isInt({ min: 1 }).withMessage('invalid').toInt();
router.get('/species-requests', [query('status').optional().isIn([...SPECIES_STATUSES, 'all']).withMessage('invalid_choice')], validate, handle(async (req, res) => {
  // Default: ALL requests, so decided ones stay visible as history
  res.json(await speciesService.listRequests({ status: req.query.status || 'all' }));
}));
// The number on the "Species requests" menu item
router.get('/species-requests/count', handle(async (req, res) => res.json({ pending: await speciesService.pendingCount() })));
// Approve: the administrator enters or confirms the name, plant type and the rules
router.post(
  '/species-requests/:id/approve',
  [requestId, ...speciesRules.filter((_, i) => i < 5)],
  validate,
  handle(async (req, res) => res.json({ species: await speciesService.approve(req.user, req.params.id, req.body) }))
);
// Reject: a reason is required, so the nursery knows why
router.post(
  '/species-requests/:id/reject',
  [requestId, body('reason').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 500 }).withMessage('too_long')],
  validate,
  handle(async (req, res) => res.json({ species: await speciesService.reject(req.user, req.params.id, req.body.reason) }))
);
// Merge a spelling duplicate into an approved species: its batches move to that species
router.post(
  '/species-requests/:id/merge',
  [
    requestId,
    body('target_id').isInt({ min: 1 }).withMessage('required').toInt(),
    body('reason').optional({ values: 'null' }).isString().trim().isLength({ max: 500 }).withMessage('too_long'),
  ],
  validate,
  handle(async (req, res) => res.json({ species: await speciesService.merge(req.user, req.params.id, req.body.target_id, req.body.reason || null) }))
);

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

// ---- Listings and plants (FR15; docs/DEVIATIONS.md W46) ----
const optionalId = (name) => query(name).optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('invalid').toInt();

// Choices for the nursery and species filters
router.get('/filter-options', handle(async (req, res) => res.json(await admin.filterOptions())));

router.get(
  '/listings',
  [query('status').optional().isIn([...LISTING_STATUSES, 'all']), optionalId('nursery_id'), optionalId('species_id')],
  validate,
  handle(async (req, res) => {
    res.json({ listings: await admin.listListings({ status: req.query.status, nurseryId: req.query.nursery_id, speciesId: req.query.species_id }) });
  })
);
// Every batch of every approved nursery, with its free quantity and whether institutions see it
router.get(
  '/plants',
  [
    optionalId('nursery_id'),
    optionalId('species_id'),
    query('stage').optional().isIn([...BATCH_STAGES, 'all']).withMessage('invalid_choice'),
    query('visibility').optional().isIn(['shown', 'hidden', 'all']).withMessage('invalid_choice'),
  ],
  validate,
  handle(async (req, res) => {
    res.json({
      plants: await admin.listPlants({ nurseryId: req.query.nursery_id, speciesId: req.query.species_id, stage: req.query.stage, visibility: req.query.visibility }),
    });
  })
);

// ---- Sales of every nursery (docs/DEVIATIONS.md W45) ----
// Totals, breakdowns and rows all come from the SALES table on the server, with the same filters.
const salesFilters = [
  query('period').optional().isIn(salesReport.PERIODS).withMessage('invalid_choice'),
  query('from').optional({ values: 'falsy' }).isISO8601({ strict: true }).withMessage('invalid_date'),
  query('to')
    .optional({ values: 'falsy' })
    .isISO8601({ strict: true })
    .withMessage('invalid_date')
    .custom((to, { req }) => !req.query.from || to >= req.query.from)
    .withMessage('invalid_range'),
  optionalId('nursery_id'),
  optionalId('species_id'),
  query('q').optional().isString().isLength({ max: 100 }).withMessage('too_long'),
];
const salesQuery = (q) => ({ period: q.period || 'month', from: q.from, to: q.to, nurseryId: q.nursery_id, speciesId: q.species_id, search: q.q });

router.get('/sales', salesFilters, validate, handle(async (req, res) => res.json(await salesReport.report(salesQuery(req.query)))));

// CSV of every matching sale. Each export is written to the audit log (who, when, which filters, how many rows).
router.get('/sales/export', salesFilters, validate, handle(async (req, res) => {
  const filters = salesQuery(req.query);
  const { csv, count, range } = await salesReport.exportCsv(filters);
  const described = [
    `period ${filters.period}: ${range.from || 'start'} to ${range.to || 'today'}`,
    filters.nurseryId && `nursery #${filters.nurseryId}`,
    filters.speciesId && `species #${filters.speciesId}`,
    filters.search && `search "${String(filters.search).slice(0, 100)}"`,
    `${count} rows`,
  ].filter(Boolean);
  await auditService.log({ actorId: req.user.id, action: 'sales.exported', entityType: 'sale', reason: described.join('; ') });
  const name = `sales-${range.from || 'all'}-to-${range.to || 'today'}.csv`;
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${name}"`);
  res.set('Cache-Control', 'no-store');
  res.send(csv);
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

// ---- Records: nurseries, institutions, batches (docs/DEVIATIONS.md W47) ----
// Archive = soft delete (reason required). Delete = permanent, only when nothing is linked (reason
// required; otherwise 409 HAS_HISTORY with what is linked). Every action is in the audit log.
const recordId = param('id').isInt({ min: 1 }).withMessage('invalid').toInt();
const recordStatus = query('status').optional().isIn(['active', 'archived', 'all']).withMessage('invalid_choice');
const searchText = query('q').optional().isString().isLength({ max: 100 }).withMessage('too_long');
const requiredReason = body('reason').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 500 }).withMessage('too_long');
const optionalReason = body('reason').optional({ values: 'null' }).isString().trim().isLength({ max: 500 }).withMessage('too_long');
const optionalDistrict = (field) => body(field).optional().isIn(KIGALI_DISTRICTS).withMessage('invalid_choice');
const optionalRequired = (field, max) => body(field).optional().isString().withMessage('invalid').trim().notEmpty().withMessage('required').isLength({ max }).withMessage('too_long');

// Archive, unarchive and delete routes are the same for the three kinds
function recordActions(path, { archive, unarchive, remove }) {
  router.post(`/${path}/:id/archive`, [recordId, requiredReason], validate, handle(async (req, res) => {
    res.json({ ok: true, released: await archive(req.user, req.params.id, req.body.reason) });
  }));
  router.post(`/${path}/:id/unarchive`, [recordId, optionalReason], validate, handle(async (req, res) => {
    await unarchive(req.user, req.params.id, req.body.reason || null);
    res.json({ ok: true });
  }));
  router.delete(`/${path}/:id`, [recordId, requiredReason], validate, handle(async (req, res) => {
    await remove(req.user, req.params.id, req.body.reason);
    res.json({ ok: true });
  }));
}

// Nurseries
router.get('/nurseries', [recordStatus, searchText, query('district').optional({ values: 'falsy' }).isIn(KIGALI_DISTRICTS)], validate, handle(async (req, res) => {
  res.json(await records.listNurseries({ status: req.query.status, q: req.query.q, district: req.query.district }));
}));
router.get('/nurseries/:id', [recordId], validate, handle(async (req, res) => res.json({ item: await records.getNursery(req.params.id) })));
router.patch(
  '/nurseries/:id',
  [recordId, optionalRequired('name', 160), optionalDistrict('district'), optionalRequired('sector', 60), v.optionalText('address_text', 255), optionalRequired('owner_full_name', 120), v.phone('owner_phone'), optionalReason],
  validate,
  handle(async (req, res) => res.json({ item: await records.updateNursery(req.user, req.params.id, req.body) }))
);
recordActions('nurseries', { archive: records.archiveNursery, unarchive: records.unarchiveNursery, remove: records.deleteNursery });

// Institutions
router.get(
  '/institutions',
  [recordStatus, searchText, query('district').optional({ values: 'falsy' }).isIn(KIGALI_DISTRICTS), query('org_type').optional({ values: 'falsy' }).isIn(ORG_TYPES)],
  validate,
  handle(async (req, res) => res.json(await records.listInstitutions({ status: req.query.status, q: req.query.q, district: req.query.district, orgType: req.query.org_type })))
);
router.get('/institutions/:id', [recordId], validate, handle(async (req, res) => res.json({ item: await records.getInstitution(req.params.id) })));
router.patch(
  '/institutions/:id',
  [
    recordId,
    optionalRequired('name', 160),
    body('org_type').optional().isIn(ORG_TYPES).withMessage('invalid_choice'),
    optionalDistrict('district'),
    optionalRequired('sector', 60),
    v.phone('contact_phone'),
    optionalRequired('user_full_name', 120),
    v.phone('user_phone'),
    optionalReason,
  ],
  validate,
  handle(async (req, res) => res.json({ item: await records.updateInstitution(req.user, req.params.id, req.body) }))
);
recordActions('institutions', { archive: records.archiveInstitution, unarchive: records.unarchiveInstitution, remove: records.deleteInstitution });

// Batches, and publishing them on the public homepage (W48)
const batchIds = body('ids')
  .isArray({ min: 1, max: 100 })
  .withMessage('required')
  .custom((ids) => ids.every((x) => Number.isInteger(x) && x > 0))
  .withMessage('invalid');
router.get(
  '/batches',
  [
    recordStatus,
    searchText,
    optionalId('nursery_id'),
    optionalId('species_id'),
    query('stage').optional().isIn([...BATCH_STAGES, 'all']).withMessage('invalid_choice'),
    query('published').optional({ values: 'falsy' }).isIn(['yes', 'shown', 'no']).withMessage('invalid_choice'),
  ],
  validate,
  handle(async (req, res) => {
    res.json(
      await records.listBatches({ status: req.query.status, q: req.query.q, nurseryId: req.query.nursery_id, speciesId: req.query.species_id, stage: req.query.stage, published: req.query.published })
    );
  })
);
router.post('/batches/publish', [batchIds], validate, handle(async (req, res) => res.json(await records.publishBatches(req.user, req.body.ids))));
router.post('/batches/unpublish', [batchIds], validate, handle(async (req, res) => res.json(await records.unpublishBatches(req.user, req.body.ids))));
router.get('/batches/:id', [recordId], validate, handle(async (req, res) => res.json({ item: await records.getBatch(req.params.id) })));
router.put(
  '/batches/:id/featured',
  [recordId, body('featured_rank').optional({ values: 'null' }).isInt({ min: 1, max: 99 }).withMessage('invalid').toInt()],
  validate,
  handle(async (req, res) => res.json({ item: await records.setFeatured(req.user, req.params.id, req.body.featured_rank ?? null) }))
);
// A quantity correction needs a reason; it is saved as a stock change (never below what is promised)
router.patch(
  '/batches/:id',
  [
    recordId,
    body('unit_price').optional().isInt({ min: 0, max: 1000000000 }).withMessage('invalid_amount').toInt(),
    body('quantity_change').optional({ values: 'falsy' }).isInt({ min: -10000000, max: 10000000 }).withMessage('invalid_quantity').toInt(),
    body('reason')
      .if((value, { req }) => Boolean(req.body.quantity_change))
      .isString()
      .withMessage('required')
      .trim()
      .notEmpty()
      .withMessage('required')
      .isLength({ max: 500 })
      .withMessage('too_long'),
    optionalReason,
  ],
  validate,
  handle(async (req, res) => res.json({ item: await records.updateBatch(req.user, req.params.id, req.body) }))
);
recordActions('batches', { archive: records.archiveBatch, unarchive: records.unarchiveBatch, remove: records.deleteBatch });

// ---- Support: help requests (docs/DEVIATIONS.md W51) ----
// Every reply, internal note and status change is written to the audit log (supportService).
const supportId = param('id').isInt({ min: 1 }).withMessage('invalid').toInt();
router.get(
  '/support',
  [
    query('status').optional({ values: 'falsy' }).isIn([...SUPPORT_STATUSES, 'all']).withMessage('invalid_choice'),
    query('category').optional({ values: 'falsy' }).isIn(SUPPORT_CATEGORIES).withMessage('invalid_choice'),
    query('role').optional({ values: 'falsy' }).isIn(['operator', 'institution', 'public']).withMessage('invalid_choice'),
    query('q').optional().isString().isLength({ max: 100 }).withMessage('too_long'),
  ],
  validate,
  handle(async (req, res) => res.json(await support.adminList({ status: req.query.status, category: req.query.category, role: req.query.role, q: req.query.q })))
);
// The number on the "Support" menu item
router.get('/support/count', handle(async (req, res) => res.json({ open: await support.openCount() })));
router.get('/support/:id', [supportId], validate, handle(async (req, res) => res.json({ ticket: await support.adminGet(req.params.id) })));
router.post(
  '/support/:id/messages',
  [
    supportId,
    body('message').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 4000 }).withMessage('too_long'),
    body('internal').optional().isBoolean({ strict: true }).withMessage('invalid'),
  ],
  validate,
  handle(async (req, res) => res.status(201).json({ ticket: await support.adminReply(req.user, req.params.id, { message: req.body.message, internal: req.body.internal === true }) }))
);
router.put('/support/:id/status', [supportId, body('status').isIn(SUPPORT_STATUSES).withMessage('invalid_choice')], validate, handle(async (req, res) => {
  res.json({ ticket: await support.adminSetStatus(req.user, req.params.id, req.body.status) });
}));

// ---- Risk job on demand for every nursery ----
router.post('/risk/run', handle(async (req, res) => {
  const expired = await surplus.expireListings();
  res.json({ expired_listings: expired, summary: await risk.runEvaluation({ actorId: req.user.id }) });
}));

// ---- Impact (FR12: detailed for the administrator) ----
router.get('/impact', handle(async (req, res) => res.json({ summary: await impact.summary(), records: await impact.records() })));

// ---- Email report (FR14): counts per status, failed and skipped emails, retry ----
router.get('/emails', handle(async (req, res) => res.json(await admin.emailReport())));
router.post('/emails/:id/retry', [param('id').isInt({ min: 1 }).toInt()], validate, handle(async (req, res) => {
  res.json({ result: await admin.retryEmail(req.user, req.params.id) });
}));

module.exports = router;

// Routes used by several roles: species list, the Surplus Board, notifications.
const express = require('express');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { loadInstitution } = require('../middleware/organisation');
const HttpError = require('../utils/httpError');
const { PlantSpecies } = require('../models');
const surplus = require('../services/surplusService');
const notifications = require('../services/notificationService');
const { KIGALI_DISTRICTS, SPECIES_CATEGORIES } = require('../utils/constants');

const router = express.Router();
// requireAuth is added per route (not router.use) so unknown /api paths still answer 404
const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

router.get('/species', requireAuth, handle(async (req, res) => {
  res.json({ species: await PlantSpecies.findAll({ order: [['common_name', 'ASC']] }) });
}));

// Surplus Board (FR10). Institutions must be approved to browse; operators and the administrator can look too.
router.get(
  '/board',
  requireAuth,
  [query('district').optional({ values: 'falsy' }).isIn(KIGALI_DISTRICTS), query('category').optional({ values: 'falsy' }).isIn(SPECIES_CATEGORIES), query('species_id').optional({ values: 'falsy' }).isInt()],
  validate,
  async (req, res, next) => {
    if (req.user.role !== 'institution') return next();
    return loadInstitution(req, res, (err) => {
      if (err) return next(err);
      if (req.institution.verification_status !== 'approved') return next(new HttpError(403, 'NOT_APPROVED', 'Your institution must be approved first'));
      return next();
    });
  },
  handle(async (req, res) => {
    res.json({ listings: await surplus.board({ district: req.query.district, category: req.query.category, speciesId: req.query.species_id }) });
  })
);

// In-app notifications (FR14)
router.get('/notifications', requireAuth, handle(async (req, res) => res.json(await notifications.listForUser(req.user.id))));
router.post('/notifications/read', requireAuth, [body('id').optional({ values: 'null' }).isInt({ min: 1 }).toInt()], validate, handle(async (req, res) => {
  await notifications.markRead(req.user.id, req.body.id || null);
  res.json({ ok: true });
}));

module.exports = router;

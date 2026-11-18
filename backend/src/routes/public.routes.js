// Public routes (no sign-in): the nursery directory and aggregate impact (FR03, FR12).
const express = require('express');
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const publicService = require('../services/publicService');
const homepage = require('../services/homepageService');
const { publicPlantsLimiter } = require('../middleware/rateLimits');
const { KIGALI_DISTRICTS, SPECIES_CATEGORIES } = require('../utils/constants');

const router = express.Router();
const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// Public data may be cached for a few minutes by browsers and the CDN
const shortCache = (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300');
  next();
};

router.get('/directory', shortCache, [query('district').optional({ values: 'falsy' }).isIn(KIGALI_DISTRICTS)], validate, handle(async (req, res) => {
  res.json({ nurseries: await publicService.directory({ district: req.query.district }) });
}));

router.get('/impact', shortCache, handle(async (req, res) => res.json(await publicService.publicImpact())));

// "Plants available now" on the homepage (docs/DEVIATIONS.md W48): only batches the administrator published,
// with ONLY species, plant type, quantity available, price, prime-window end, nursery name and district.
// Rate-limited, and cached for 60 seconds (browsers and the CDN), so quantities are at most a minute old.
const plantsCache = (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=60');
  next();
};
router.get(
  '/plants',
  publicPlantsLimiter,
  plantsCache,
  [query('district').optional({ values: 'falsy' }).isIn(KIGALI_DISTRICTS), query('category').optional({ values: 'falsy' }).isIn(SPECIES_CATEGORIES)],
  validate,
  handle(async (req, res) => res.json({ plants: await homepage.publicPlants({ district: req.query.district, category: req.query.category }) }))
);

module.exports = router;

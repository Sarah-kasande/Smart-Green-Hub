// Public routes (no sign-in): the nursery directory and aggregate impact (FR03, FR12).
const express = require('express');
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const publicService = require('../services/publicService');
const homepage = require('../services/homepageService');
const { publicPlantsLimiter, contactLimiter } = require('../middleware/rateLimits');
const support = require('../services/supportService');
const { body } = require('express-validator');
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

// Public contact form (W51): for people who are not signed in (cannot sign in, waiting for approval, ...).
// No account needed. Rate-limited (5 per hour per address) and protected by a honeypot field ("website")
// that people never see: a robot that fills it gets the same answer, but nothing is saved.
router.post(
  '/contact',
  contactLimiter,
  [
    body('name').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 120 }).withMessage('too_long'),
    body('email').isString().withMessage('required').trim().isEmail().withMessage('invalid_email').isLength({ max: 190 }).withMessage('too_long'),
    body('message').isString().withMessage('required').trim().isLength({ min: 10 }).withMessage('too_short').isLength({ max: 4000 }).withMessage('too_long'),
    body('website').optional().isString(),
  ],
  validate,
  handle(async (req, res) => {
    await support.createPublicTicket({ name: req.body.name, email: req.body.email, message: req.body.message, website: req.body.website });
    // The same answer whether or not the honeypot was filled
    res.status(201).json({ ok: true });
  })
);

module.exports = router;

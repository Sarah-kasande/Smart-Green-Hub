// Public routes (no sign-in): the nursery directory and aggregate impact (FR03, FR12).
const express = require('express');
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const publicService = require('../services/publicService');
const { KIGALI_DISTRICTS } = require('../utils/constants');

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

module.exports = router;

// Scheduled work called by Vercel Cron (the "crons" list in the root vercel.json).
// Vercel sends the header "Authorization: Bearer <CRON_SECRET>". Without the right secret
// nothing runs, so nobody else can start the job. Locally and on Render the same work is
// done by node-cron instead (src/jobs/scheduler.js).
const crypto = require('crypto');
const express = require('express');
const HttpError = require('../utils/httpError');
const { nightly } = require('../jobs/scheduler');
const { dispatchPending } = require('../services/notificationService');

const router = express.Router();

function isVercelCron(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(req.get('authorization') || '');
  // timingSafeEqual: comparing takes the same time whatever the input, so the secret cannot be guessed by timing
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// Once a day: expire old listings, run the risk evaluation, then send any emails still waiting
// (on Vercel's free plan a job can run only once a day, so the email retry is done here too).
router.get('/nightly', async (req, res) => {
  if (!isVercelCron(req)) throw new HttpError(401, 'UNAUTHORIZED', 'Only the scheduler can start this job');
  await nightly();
  const emails = await dispatchPending();
  res.json({ ok: true, emails });
});

module.exports = router;

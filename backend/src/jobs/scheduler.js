// Scheduled background work (the "background worker" of Figure 2), using node-cron.
//  - Every night at 02:00 Kigali time: expire old listings, then run the risk evaluation (FR06)
//  - Every 5 minutes: send waiting notification emails and retry failed ones (FR14)
// Note: on Render's free plan the server sleeps when unused, so a job may run later than planned;
// the risk evaluation can always be started on demand from the Alerts page.
const cron = require('node-cron');
const { runEvaluation } = require('../services/riskService');
const { expireListings } = require('../services/surplusService');
const { dispatchPending } = require('../services/notificationService');

async function nightly() {
  const started = Date.now();
  try {
    const expired = await expireListings();
    const summary = await runEvaluation();
    console.log(`Nightly job: ${expired} listings expired; risk ${JSON.stringify(summary)} (${Date.now() - started} ms)`);
  } catch (error) {
    console.error('Nightly job FAILED:', error.message);
  }
}

function startScheduler() {
  cron.schedule('0 2 * * *', nightly, { timezone: 'Africa/Kigali', name: 'nightly-risk' });
  cron.schedule('*/5 * * * *', () => dispatchPending().catch((e) => console.error('Dispatch failed:', e.message)), { name: 'notifications' });
}

module.exports = { startScheduler, nightly };

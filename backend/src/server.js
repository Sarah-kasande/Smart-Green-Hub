// Starts the API. Migrations already ran before this file (see "start" in package.json).
require('./config/env');
const app = require('./app');
const sequelize = require('./db');
const { runBootstrap } = require('./services/bootstrapService');
const { startScheduler } = require('./jobs/scheduler');

const { isProduction } = require('./config/env');
const { emailConfig } = require('./services/emailService');

if (!process.env.JWT_SECRET) console.warn('WARNING: JWT_SECRET is not set. Sign-in will not work.');

// Email check at startup (no secret is printed)
const email = emailConfig();
if (!email.configured && isProduction) {
  console.error(`ERROR: email is NOT configured (${email.problem}). No confirmation codes or notifications can be sent. Set BREVO_API_KEY and MAIL_FROM ("Name <address>").`);
} else if (!email.configured) {
  console.warn(`Email: ${email.problem}. Emails are printed to this console and marked 'skipped'.`);
} else {
  console.log('Email: Brevo is configured');
}

const port = process.env.PORT || 5000;
app.listen(port, async () => {
  // The git commit Render deployed. Shown here and in /api/health only (never to users), so
  // you can check that the API and the app on Vercel were deployed from the same commit.
  console.log(`API running on ${port} (version ${(process.env.RENDER_GIT_COMMIT || 'local').slice(0, 7)})`);
  try {
    await sequelize.authenticate();
    console.log('Database connected');
  } catch (e) {
    console.error('Database connection FAILED:', e.message);
    return;
  }
  // Creates the first administrator (if none exists) and DEMO species (if the table is empty).
  try {
    await runBootstrap();
  } catch (e) {
    console.error('Startup data check FAILED:', e.message);
  }
  // Nightly risk evaluation + notification sending (src/jobs/scheduler.js)
  startScheduler();
});

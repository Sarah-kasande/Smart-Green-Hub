// Starts the API. Migrations already ran before this file (see "start" in package.json).
require('./config/env');
const app = require('./app');
const sequelize = require('./db');
const { runBootstrap } = require('./services/bootstrapService');
const { startScheduler } = require('./jobs/scheduler');

if (!process.env.JWT_SECRET) console.warn('WARNING: JWT_SECRET is not set. Sign-in will not work.');

const port = process.env.PORT || 5000;
app.listen(port, async () => {
  console.log(`API running on ${port}`);
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

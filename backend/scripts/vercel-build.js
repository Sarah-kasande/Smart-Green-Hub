// Runs during the Vercel build of the API (buildCommand in the root vercel.json).
// On Render, "npm start" ran the database migrations before starting the API. On Vercel there
// is no start command, so the migrations run here, before the new version goes live.
//   - Only for PRODUCTION deployments: preview deployments must never change the real database.
//   - Without the database settings (e.g. the very first deploy, before the environment variables
//     were added) the migrations are skipped with a warning, so the deploy itself still works.
//   - With the settings, a failed migration stops the deployment, so the old version keeps running.
const { spawnSync } = require('child_process');

// Neon PostgreSQL needs only DATABASE_URL. The older MySQL settings are still accepted.
const { postgresUrl } = require('../src/config/database');
const MYSQL_SETTINGS = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_CA_CERT'];

if (process.env.VERCEL_ENV !== 'production') {
  console.log(`Build: skipping database migrations (VERCEL_ENV=${process.env.VERCEL_ENV || 'not set'})`);
  process.exit(0);
}

const configured = postgresUrl() || MYSQL_SETTINGS.every((name) => process.env[name]);
const missing = configured ? [] : ['DATABASE_URL'];
if (missing.length > 0) {
  console.warn(
    `Build: WARNING - database migrations skipped, these environment variables are missing: ${missing.join(', ')}.\n` +
      '       Add them in Vercel (Settings -> Environment Variables, Production), then redeploy.\n' +
      '       Until then the API cannot reach the database (/api/health will show an error).'
  );
  process.exit(0);
}

console.log('Build: running database migrations');
// Through scripts/migrate.js, the only way allowed to change the live database (VERCEL=1 here)
const result = spawnSync('node', ['scripts/migrate.js', 'up', '--deploy'], { stdio: 'inherit', shell: true });
if (result.status !== 0) {
  console.error(
    'Build: database migrations FAILED (message above). Common causes:\n' +
      '       - "password authentication failed": the password in DATABASE_URL is old (Neon -> Roles -> reset it, then update DATABASE_URL)\n' +
      '       - "ENOTFOUND" / "ETIMEDOUT": DATABASE_URL is incomplete, or the Neon project is suspended\n' +
      '       - "Access denied" / "certificate": only with the old MySQL settings (DB_USER, DB_PASSWORD, DB_CA_CERT)'
  );
  process.exit(1);
}

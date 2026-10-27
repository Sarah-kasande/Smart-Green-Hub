// Runs during the Vercel build of the API (buildCommand in the root vercel.json).
// On Render, "npm start" ran the database migrations before starting the API. On Vercel there
// is no start command, so the migrations run here, before the new version goes live.
//   - Only for PRODUCTION deployments: preview deployments must never change the real database.
//   - Without the database settings (e.g. the very first deploy, before the environment variables
//     were added) the migrations are skipped with a warning, so the deploy itself still works.
//   - With the settings, a failed migration stops the deployment, so the old version keeps running.
const { spawnSync } = require('child_process');

const REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_CA_CERT'];

if (process.env.VERCEL_ENV !== 'production') {
  console.log(`Build: skipping database migrations (VERCEL_ENV=${process.env.VERCEL_ENV || 'not set'})`);
  process.exit(0);
}

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.warn(
    `Build: WARNING - database migrations skipped, these environment variables are missing: ${missing.join(', ')}.\n` +
      '       Add them in Vercel (Settings -> Environment Variables, Production), then redeploy.\n' +
      '       Until then the API cannot reach the database (/api/health will show an error).'
  );
  process.exit(0);
}

console.log('Build: running database migrations');
const result = spawnSync('npx', ['sequelize-cli', 'db:migrate'], { stdio: 'inherit', shell: true });
if (result.status !== 0) {
  console.error(
    'Build: database migrations FAILED (message above). Common causes:\n' +
      '       - "ETIMEDOUT" / "connect": Aiven does not allow Vercel\'s address (Aiven console -> Allowed IP addresses)\n' +
      '       - "Access denied": DB_USER or DB_PASSWORD is wrong\n' +
      '       - "certificate" / "secure connection": DB_CA_CERT is missing or not the full certificate text'
  );
  process.exit(1);
}

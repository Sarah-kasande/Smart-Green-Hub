// Runs during the Vercel build of the API (buildCommand in the root vercel.json).
// On Render, "npm start" ran the database migrations before starting the API. On Vercel there
// is no start command, so the migrations run here, before the new version goes live.
// Only for PRODUCTION deployments: preview deployments must never change the real database.
const { spawnSync } = require('child_process');

if (process.env.VERCEL_ENV !== 'production') {
  console.log(`Build: skipping database migrations (VERCEL_ENV=${process.env.VERCEL_ENV || 'not set'})`);
  process.exit(0);
}

console.log('Build: running database migrations');
const result = spawnSync('npx', ['sequelize-cli', 'db:migrate'], { stdio: 'inherit', shell: true });
// A failed migration stops the deployment, so the old version keeps running.
process.exit(result.status === 0 ? 0 : 1);

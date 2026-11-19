// Configuration used by sequelize-cli (migrations).
// The environment variables decide which database is used, so every NODE_ENV gets the same settings.
//
// Safety: sequelize-cli refuses the LIVE database (Neon "neondb" or any remote host) unless it
// was started by scripts/migrate.js with an explicit live command (npm run migrate:live, or
// npm start on Render / Vercel). So a stray "npx sequelize-cli db:migrate:undo:all" can never
// empty the live database.
require('./env');
const { buildDbConfig } = require('./database');
const { dbTarget, describeTarget } = require('../utils/dbSafety');

const target = dbTarget();
if (target.live && process.env.SGH_LIVE_MIGRATION !== 'allowed') {
  throw new Error(
    `Refusing to run sequelize-cli against the live ${describeTarget(target)}.\n` +
      'Use "npm run migrate:live" (apply new migrations) or "npm run migrate:live:status" (read-only check).'
  );
}

const config = buildDbConfig();

module.exports = { development: config, test: config, production: config };

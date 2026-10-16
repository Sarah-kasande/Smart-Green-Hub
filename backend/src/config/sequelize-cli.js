// Configuration used by sequelize-cli (npm run migrate).
// The environment variables decide which database is used, so every NODE_ENV gets the same settings.
require('./env');
const { buildDbConfig } = require('./database');

const config = buildDbConfig();

module.exports = { development: config, test: config, production: config };

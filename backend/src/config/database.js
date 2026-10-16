// Builds the Sequelize connection options from environment variables.
// Shared by src/db.js (the running app) and sequelize-cli (migrations), so both
// always connect to the same database in the same way.
const fs = require('fs');

// Aiven needs its CA certificate. DB_CA_CERT holds the certificate text (Render),
// DB_CA_PATH points to a file (local only).
function loadCa() {
  const raw = process.env.DB_CA_CERT || process.env.DB_CA_PATH;
  if (!raw) return undefined;
  const value = raw.trim();
  if (value.includes('BEGIN CERTIFICATE')) return value.replace(/\\n/g, '\n');
  return fs.readFileSync(value, 'utf8');
}

function buildDbConfig() {
  // SSL is on unless DB_SSL=false. Only the local MySQL in Docker turns it off.
  const useSsl = process.env.DB_SSL !== 'false';
  const ca = useSsl ? loadCa() : undefined;

  return {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'mysql',
    logging: false,
    // Store and read all dates in UTC.
    timezone: '+00:00',
    dialectOptions: useSsl ? { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true } } : {},
  };
}

module.exports = { buildDbConfig };

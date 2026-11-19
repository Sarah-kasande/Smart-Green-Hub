// Builds the Sequelize connection options from environment variables.
// Shared by src/db.js (the running app) and sequelize-cli (migrations), so both
// always connect to the same database in the same way.
//
// Two kinds of database are supported:
//   - PostgreSQL (Neon, the live database): DATABASE_URL=postgresql://user:password@host/db?sslmode=require
//   - MySQL (a local MySQL for development and tests): DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
// DATABASE_URL wins when both are set. The connection string is never printed or logged.
const fs = require('fs');

// The PostgreSQL connection string, if one is configured. DB_HOST holding a postgres:// URL is
// accepted too, so a URL pasted into the wrong variable still works.
function postgresUrl(env = process.env) {
  const candidates = [env.DATABASE_URL, env.DB_HOST];
  const url = candidates.find((value) => /^postgres(ql)?:\/\//i.test((value || '').trim()));
  return url ? url.trim() : null;
}

// Aiven MySQL needed its CA certificate. DB_CA_CERT holds the certificate text, DB_CA_PATH a file.
function loadCa() {
  const raw = process.env.DB_CA_CERT || process.env.DB_CA_PATH;
  if (!raw) return undefined;
  const value = raw.trim();
  if (value.includes('BEGIN CERTIFICATE')) return value.replace(/\\n/g, '\n');
  return fs.readFileSync(value, 'utf8');
}

function postgresConfig(url) {
  const pg = require('pg');
  // COUNT(*) and other BIGINT results arrive as text in PostgreSQL; MySQL returned numbers.
  // Read them as numbers so the rest of the code sees the same values on both databases.
  pg.types.setTypeParser(20, (value) => (value === null ? null : Number(value)));

  const parsed = new URL(url);
  const params = parsed.searchParams;
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  const useSsl = params.get('sslmode') ? params.get('sslmode') !== 'disable' : !local;

  const dialectOptions = {};
  if (useSsl) dialectOptions.ssl = { require: true, rejectUnauthorized: true };
  if (params.get('channel_binding') === 'require') dialectOptions.enableChannelBinding = true;

  return {
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    dialect: 'postgres',
    // Passed explicitly so Vercel's bundler includes the driver (same reason as mysql2 below).
    dialectModule: pg,
    logging: false,
    timezone: '+00:00',
    // Serverless functions open few connections each; Neon's pooler handles the rest.
    pool: { max: 5, min: 0, idle: 10000, acquire: 30000 },
    dialectOptions,
  };
}

function mysqlConfig() {
  // SSL is on unless DB_SSL=false. Only the local MySQL on your own computer turns it off.
  const useSsl = process.env.DB_SSL !== 'false';
  const ca = useSsl ? loadCa() : undefined;
  return {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'mysql',
    // Sequelize normally loads the mysql2 driver by name at runtime, which Vercel's bundler cannot
    // see, so the driver was left out and the API crashed on Vercel. Passing it here includes it.
    dialectModule: require('mysql2'),
    logging: false,
    // Store and read all dates in UTC.
    timezone: '+00:00',
    dialectOptions: useSsl ? { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true } } : {},
  };
}

function buildDbConfig() {
  const url = postgresUrl();
  return url ? postgresConfig(url) : mysqlConfig();
}

module.exports = { buildDbConfig, postgresUrl };

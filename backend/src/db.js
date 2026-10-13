const fs = require('fs');
const { Sequelize } = require('sequelize');

function loadCa() {
  const raw = process.env.DB_CA_CERT || process.env.DB_CA_PATH;
  if (!raw) return undefined;
  const value = raw.trim();
  if (value.includes('BEGIN CERTIFICATE')) return value.replace(/\\n/g, '\n');
  return fs.readFileSync(value, 'utf8');
}

const ca = loadCa();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true },
    },
  }
);

module.exports = sequelize;
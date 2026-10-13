const fs = require('fs');
const { Sequelize } = require('sequelize');

function loadCa() {
  const raw = process.env.DB_CA_CERT || process.env.DB_CA_PATH;
  if (!raw) return undefined;
  const value = raw.trim();
  // If the value is the certificate text itself, use it directly
  if (value.includes('BEGIN CERTIFICATE')) return value.replace(/\\n/g, '\n');
  // Otherwise treat it as a file path (local development)
  return fs.readFileSync(value, 'utf8');
}

const ca = loadCa();
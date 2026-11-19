// Loads environment variables from files (local machine only).
// On Render there are no files: the variables come from the dashboard.
//
// Order matters because dotenv never overwrites a value that is already set:
//   - Tests (NODE_ENV=test) load ONLY .env.test, so they can never pick up the Aiven settings in .env.
//   - Local development loads .env.local first (points at the local MySQL), then .env fills anything missing.
const path = require('path');
const dotenv = require('dotenv');

const backendRoot = path.join(__dirname, '..', '..');

if (process.env.ENV_FILE) {
  // End-to-end tests start the API with their own file (backend/.env.e2e), and nothing else
  dotenv.config({ path: path.join(backendRoot, process.env.ENV_FILE), quiet: true });
} else if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.join(backendRoot, '.env.test'), quiet: true });
} else {
  // DATABASE_URL in .env points at the LIVE Neon database. When .env.local exists (local development),
  // it decides the database: the URL from .env is dropped unless .env.local sets DATABASE_URL itself
  // (or it was already set before any file was read, as on the hosting platform).
  const presetUrl = process.env.DATABASE_URL;
  const fs = require('fs');
  const localFile = path.join(backendRoot, '.env.local');
  const localValues = fs.existsSync(localFile) ? dotenv.parse(fs.readFileSync(localFile)) : null;
  dotenv.config({ path: localFile, quiet: true });
  // An EMPTY line in .env.local (e.g. 'BREVO_API_KEY=') must not hide the real value in .env:
  // dotenv never overwrites a variable that exists, even an empty one, so empty ones are removed first.
  for (const [name, value] of Object.entries(process.env)) {
    if (value === '') delete process.env[name];
  }
  dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true });
  if (localValues && !localValues.DATABASE_URL && !presetUrl) delete process.env.DATABASE_URL;
}

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

module.exports = { isProduction, isTest };

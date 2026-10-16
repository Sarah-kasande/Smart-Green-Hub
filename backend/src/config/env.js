// Loads environment variables from files (local machine only).
// On Render there are no files: the variables come from the dashboard.
//
// Order matters because dotenv never overwrites a value that is already set:
//   - Tests (NODE_ENV=test) load ONLY .env.test, so they can never pick up the Aiven settings in .env.
//   - Local development loads .env.local first (points at the local MySQL), then .env fills anything missing.
const path = require('path');
const dotenv = require('dotenv');

const backendRoot = path.join(__dirname, '..', '..');

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.join(backendRoot, '.env.test'), quiet: true });
} else {
  dotenv.config({ path: path.join(backendRoot, '.env.local'), quiet: true });
  dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true });
}

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

module.exports = { isProduction, isTest };

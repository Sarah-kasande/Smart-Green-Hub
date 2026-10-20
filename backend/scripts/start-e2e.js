// Starts the API for the Playwright end-to-end tests (frontend/e2e).
// Uses backend/.env.e2e ONLY, refuses to run against Aiven, rebuilds the e2e database from the
// migrations, empties the email file, then starts the normal server.
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

process.env.ENV_FILE = '.env.e2e';
require('../src/config/env');

const host = (process.env.DB_HOST || '').toLowerCase();
if (host.includes('aivencloud.com') || !(process.env.DB_NAME || '').endsWith('_e2e')) {
  console.error('ABORTED: end-to-end tests must use the local smart_green_hub_e2e database.');
  process.exit(1);
}

const backendRoot = path.join(__dirname, '..');
const options = { cwd: backendRoot, env: process.env, stdio: 'inherit' };
execSync('npx sequelize-cli db:migrate:undo:all', options);
execSync('npx sequelize-cli db:migrate', options);
fs.writeFileSync(path.join(backendRoot, process.env.EMAIL_OUTBOX_FILE), '');
process.env.EMAIL_OUTBOX_FILE = path.join(backendRoot, process.env.EMAIL_OUTBOX_FILE);

require('../src/server');

// Starts the API for the Playwright end-to-end tests (frontend/e2e).
// Uses backend/.env.e2e ONLY, refuses the live database (Neon "neondb" or any remote host),
// rebuilds the local e2e database from the migrations, adds the TEST species the tests need
// (the server itself never creates species), empties the email file, then starts the normal server.
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

process.env.ENV_FILE = '.env.e2e';
require('../src/config/env');
const { dbTarget, describeTarget } = require('../src/utils/dbSafety');

const target = dbTarget();
if (target.live || !target.name.endsWith('_e2e')) {
  console.error(`ABORTED: end-to-end tests refuse ${describeTarget(target)}. They only use the local smart_green_hub_e2e database.`);
  process.exit(1);
}

// Test fixtures for the LOCAL e2e database only (labelled so they can never be mistaken for real data)
const TEST_SPECIES = [
  { common_name: 'Grevillea robusta [TEST]', category: 'tree' },
  { common_name: 'Jacaranda mimosifolia [TEST]', category: 'tree' },
  { common_name: 'Bougainvillea spectabilis [TEST]', category: 'shrub' },
  { common_name: 'Rosa (rose) [TEST]', category: 'flower' },
];

async function main() {
  const backendRoot = path.join(__dirname, '..');
  const options = { cwd: backendRoot, env: process.env, stdio: 'inherit' };
  execSync('npx sequelize-cli db:migrate:undo:all', options);
  execSync('npx sequelize-cli db:migrate', options);

  const { PlantSpecies } = require('../src/models');
  await PlantSpecies.bulkCreate(TEST_SPECIES.map((s) => ({ ...s, default_days_to_ready: 180, default_prime_days: 60 })));

  fs.writeFileSync(path.join(backendRoot, process.env.EMAIL_OUTBOX_FILE), '');
  process.env.EMAIL_OUTBOX_FILE = path.join(backendRoot, process.env.EMAIL_OUTBOX_FILE);

  require('../src/server');
}

main().catch((error) => {
  console.error('E2E start FAILED:', error.message);
  process.exit(1);
});

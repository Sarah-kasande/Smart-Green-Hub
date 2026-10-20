// Runs when the server starts. Both steps are idempotent: running them again changes nothing.
const bcrypt = require('bcryptjs');
const { User, PlantSpecies } = require('../models');
const audit = require('./auditService');
const { BCRYPT_ROUNDS } = require('./authService');

// Creates the first administrator from ADMIN_EMAIL and ADMIN_PASSWORD, but ONLY if no
// administrator exists yet. The email and password are never logged.
// Returns a short status word (used by tests and the startup log).
async function ensureAdmin() {
  const adminCount = await User.count({ where: { role: 'admin' }, paranoid: false });
  if (adminCount > 0) return 'exists';

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) return 'missing-env';

  // Never turn an existing operator or institution account into an administrator.
  const sameEmail = await User.findOne({ where: { email }, paranoid: false });
  if (sameEmail) return 'email-in-use';

  const admin = await User.create({
    role: 'admin',
    full_name: 'Administrator',
    email,
    password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    // Provisioned by the system owner, so no email confirmation code is needed.
    email_verified_at: new Date(),
  });
  await audit.log({ actorId: null, action: 'admin.provisioned', entityType: 'user', entityId: admin.id });
  return 'created';
}

// DEMO species so batches can be tried before the needs assessment.
// The names are common Kigali plants; the day values are PLACEHOLDERS, not research data.
// They are inserted only when the species table is completely empty, and the administrator
// replaces them after the needs assessment.
const DEMO_LABEL = '[DEMO - confirm in needs assessment]';
const DEMO_SPECIES = [
  { name: 'Grevillea robusta', category: 'tree' },
  { name: 'Jacaranda mimosifolia', category: 'tree' },
  { name: 'Persea americana (avocado)', category: 'tree' },
  { name: 'Moringa oleifera', category: 'tree' },
  { name: 'Bougainvillea spectabilis', category: 'shrub' },
  { name: 'Rosa (rose)', category: 'flower' },
];
const DEMO_DAYS_TO_READY = 180;
const DEMO_PRIME_DAYS = 60;

async function ensureDemoSpecies() {
  const count = await PlantSpecies.count({ paranoid: false });
  if (count > 0) return 'exists';
  await PlantSpecies.bulkCreate(
    DEMO_SPECIES.map((s) => ({
      common_name: `${s.name} ${DEMO_LABEL}`,
      kinyarwanda_name: null,
      category: s.category,
      default_days_to_ready: DEMO_DAYS_TO_READY,
      default_prime_days: DEMO_PRIME_DAYS,
    }))
  );
  return 'created';
}

async function runBootstrap() {
  const adminStatus = await ensureAdmin();
  const messages = {
    exists: 'Administrator: already exists',
    created: 'Administrator: created from ADMIN_EMAIL / ADMIN_PASSWORD',
    'missing-env': 'Administrator: NOT created (ADMIN_EMAIL or ADMIN_PASSWORD is not set)',
    'email-in-use': 'Administrator: NOT created (ADMIN_EMAIL already belongs to another account)',
  };
  console.log(messages[adminStatus]);
  const speciesStatus = await ensureDemoSpecies();
  if (speciesStatus === 'created') console.log('Plant species: DEMO rows inserted (replace after the needs assessment)');
}

module.exports = { ensureAdmin, ensureDemoSpecies, runBootstrap, DEMO_LABEL };

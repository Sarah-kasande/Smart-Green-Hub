// Runs when the server starts. Every step is idempotent: running it again changes nothing, and it
// never overwrites anything the administrator has edited.
//   1. the first administrator, from ADMIN_EMAIL and ADMIN_PASSWORD (only if no administrator exists)
//   2. the default risk rule (Table 5 values), only if the default row is missing
// It NEVER inserts plant species or any other data: the live database holds real data only, and the
// administrator adds the real species in Rules & Species.
const bcrypt = require('bcryptjs');
const { User, PlantSpecies, RuleSetting } = require('../models');
const audit = require('./auditService');
const { BCRYPT_ROUNDS } = require('./authService');
const { FALLBACK } = require('./ruleService');

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

// The default rule row (species_id = NULL) with the Table 5 values of the proposal. The migration
// 20261016000019 inserts it too; this is a second safety net. An existing row is never changed,
// so thresholds the administrator edited in Rules & Species are kept.
async function ensureDefaultRule() {
  const existing = await RuleSetting.findOne({ where: { species_id: null } });
  if (existing) return 'exists';
  const rule = await RuleSetting.create({ species_id: null, prime_window_days: null, ...FALLBACK, updated_by: null });
  await audit.log({ actorId: null, action: 'rules.defaults_created', entityType: 'rule_setting', entityId: rule.id });
  return 'created';
}

// Kept only so scripts/seed-species.js can archive DEMO species left in an older local database.
// The server no longer creates DEMO species anywhere.
const DEMO_LABEL = '[DEMO - confirm in needs assessment]';

async function runBootstrap() {
  const adminStatus = await ensureAdmin();
  const messages = {
    exists: 'Administrator: already exists',
    created: 'Administrator: created from ADMIN_EMAIL / ADMIN_PASSWORD',
    'missing-env': 'Administrator: NOT created (ADMIN_EMAIL or ADMIN_PASSWORD is not set)',
    'email-in-use': 'Administrator: NOT created (ADMIN_EMAIL already belongs to another account)',
  };
  console.log(messages[adminStatus]);
  const ruleStatus = await ensureDefaultRule();
  console.log(ruleStatus === 'created' ? 'Risk rules: default Table 5 values created' : 'Risk rules: already set');
  if ((await PlantSpecies.count()) === 0) console.log('Plant species: none yet. The administrator adds them in Rules & Species.');
}

module.exports = { ensureAdmin, ensureDefaultRule, runBootstrap, DEMO_LABEL };

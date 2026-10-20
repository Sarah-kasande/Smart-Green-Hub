// Shared helpers for API tests. All accounts here are fake test accounts.
const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');
const { sentEmails } = require('../src/services/emailService');

// Empties every table (except the migration history) and puts back the default rule row.
async function resetDatabase() {
  const [tables] = await sequelize.query('SHOW TABLES');
  const names = tables.map((row) => Object.values(row)[0]).filter((n) => n !== 'SequelizeMeta');
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const name of names) await sequelize.query(`TRUNCATE TABLE \`${name}\``);
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  await sequelize.query(
    'INSERT INTO rule_settings (species_id, sales_lookback_days, medium_risk_ratio, high_risk_ratio, safety_margin, far_days, near_days) VALUES (NULL, 28, 0.2, 0.5, 0.1, 28, 7)'
  );
  sentEmails.length = 0;
}

// A browser-like client: keeps cookies and sends the CSRF header on every call.
async function newClient() {
  const agent = request.agent(app);
  const res = await agent.get('/api/auth/me');
  const cookie = (res.headers['set-cookie'] || []).find((c) => c.startsWith('sgh_csrf='));
  const csrf = cookie.split(';')[0].split('=')[1];
  const withCsrf = (method) => (url) => agent[method](url).set('X-CSRF-Token', csrf);
  return { agent, csrf, get: (url) => agent.get(url), post: withCsrf('post'), put: withCsrf('put'), patch: withCsrf('patch') };
}

// Pulls the 64-character token out of the last email sent to an address.
function lastTokenSentTo(email) {
  const mail = [...sentEmails].reverse().find((m) => m.to === email);
  const match = mail && mail.text.match(/token=([a-f0-9]{64})/);
  return match ? match[1] : null;
}

const TEST_PASSWORD = 'GreenTest123';

function operatorData(email, overrides = {}) {
  return {
    role: 'operator',
    full_name: 'Test Operator',
    email,
    password: TEST_PASSWORD,
    nursery: { name: 'Test Nursery', district: 'Kicukiro', sector: 'Kanombe', address_text: 'Test address' },
    ...overrides,
  };
}

function institutionData(email, overrides = {}) {
  return {
    role: 'institution',
    full_name: 'Test Institution Contact',
    email,
    password: TEST_PASSWORD,
    institution: { org_name: 'Test School', org_type: 'school', district: 'Gasabo', sector: 'Remera' },
    ...overrides,
  };
}

// Registers, confirms the email and signs in. Returns the signed-in client.
async function registerVerifiedUser(data) {
  const client = await newClient();
  const reg = await client.post('/api/auth/register').send(data);
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  await client.post('/api/auth/verify-email').send({ token: lastTokenSentTo(data.email) });
  const login = await client.post('/api/auth/login').send({ email: data.email, password: data.password });
  if (login.status !== 200) throw new Error(`login failed: ${login.status}`);
  return client;
}

// Signs in as the fake test administrator from .env.test (created by ensureAdmin).
async function adminClient() {
  const { ensureAdmin } = require('../src/services/bootstrapService');
  await ensureAdmin();
  const client = await newClient();
  const res = await client.post('/api/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  if (res.status !== 200) throw new Error(`admin login failed: ${res.status}`);
  return client;
}

// Registers a user and has the administrator approve their nursery / institution.
// Returns { client, id } where id is the nursery or institution id.
async function approvedUser(admin, data) {
  const client = await registerVerifiedUser(data);
  const me = await client.get('/api/auth/me');
  const org = me.body.organisation;
  const res = await admin.post(`/api/admin/verifications/${org.type}/${org.id}/decision`).send({ decision: 'approve' });
  if (res.status !== 200) throw new Error(`approve failed: ${res.status}`);
  return { client, id: org.id };
}

// Puts DEMO species in (the reset empties the table) and returns them
async function demoSpecies() {
  const { ensureDemoSpecies } = require('../src/services/bootstrapService');
  const { PlantSpecies } = require('../src/models');
  await ensureDemoSpecies();
  return PlantSpecies.findAll({ order: [['id', 'ASC']] });
}

let counter = 0;
const uniqueEmail = (prefix) => `${prefix}-${Date.now()}-${counter++}@example.test`;

module.exports = {
  approvedUser,
  demoSpecies,
  uniqueEmail,
  app,
  sequelize,
  sentEmails,
  resetDatabase,
  newClient,
  lastTokenSentTo,
  TEST_PASSWORD,
  operatorData,
  institutionData,
  registerVerifiedUser,
  adminClient,
};

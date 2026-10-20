// Phase 5 (admin dashboard, rules, species, audit) and Phase 6 (notifications) API tests.
const h = require('../helpers');
const { RuleSetting, Notification, AuditLog } = require('../../src/models');
const { dispatchPending, notify } = require('../../src/services/notificationService');

let admin;
let op;
let opUserId;

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  await h.demoSpecies();
  const email = h.uniqueEmail('op');
  op = (await h.approvedUser(admin, h.operatorData(email))).client;
  opUserId = (await op.get('/api/auth/me')).body.user.id;
});
afterAll(() => h.sequelize.close());

describe('administrator dashboard (FR15)', () => {
  test('shows registrations, batches, alerts, listings, requests and impact', async () => {
    const res = await admin.get('/api/admin/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.nurseries.approved).toBe(1);
    expect(res.body.impact).toMatchObject({ plants_redirected: 0, handovers: 0 }); // zeros, never invented
  });
  test('only administrators may open it', async () => {
    expect((await op.get('/api/admin/dashboard')).status).toBe(403);
  });
});

describe('rules (Table 5, FR15)', () => {
  test('defaults are the proposal values', async () => {
    const res = await admin.get('/api/admin/rules');
    expect(res.body.rules).toMatchObject({ sales_lookback_days: 28, medium_risk_ratio: 0.2, high_risk_ratio: 0.5, safety_margin: 0.1, far_days: 28, near_days: 7 });
  });
  test('medium must stay below high', async () => {
    const res = await admin.put('/api/admin/rules').send({ sales_lookback_days: 28, medium_risk_ratio: 0.6, high_risk_ratio: 0.5, safety_margin: 0.1, far_days: 28, near_days: 7 });
    expect(res.body.details.fields.medium_risk_ratio).toBe('must_be_below_high');
  });
  test('a change is saved and audited with before -> after', async () => {
    const res = await admin.put('/api/admin/rules').send({ sales_lookback_days: 21, medium_risk_ratio: 0.25, high_risk_ratio: 0.5, safety_margin: 0.15, far_days: 28, near_days: 7 });
    expect(res.body.rules).toMatchObject({ sales_lookback_days: 21, medium_risk_ratio: 0.25, safety_margin: 0.15 });
    const log = await AuditLog.findOne({ where: { action: 'rules.updated' }, order: [['id', 'DESC']] });
    expect(log.reason).toContain('sales_lookback_days 28 -> 21');
  });
});

describe('species (FR15)', () => {
  let speciesId;
  test('create a species with a prime-window override', async () => {
    const res = await admin.post('/api/admin/species').send({ common_name: 'Test Ficus', kinyarwanda_name: '', category: 'tree', default_days_to_ready: 100, default_prime_days: 40, prime_window_override: 20 });
    expect(res.status).toBe(201);
    speciesId = res.body.species.id;
    expect((await RuleSetting.findOne({ where: { species_id: speciesId } })).prime_window_days).toBe(20);
  });
  test('new batches use the override instead of the species default', async () => {
    const res = await op.post('/api/operator/batches').send({ species_id: speciesId, quantity: 10, planting_date: '2026-01-01', unit_price: 0 });
    // ready = +100 days = 2026-04-11, prime end = +20 (override) = 2026-05-01
    expect(res.body.batch).toMatchObject({ expected_ready_date: '2026-04-11', prime_end_date: '2026-05-01' });
  });
  test('removing the override and archiving', async () => {
    await admin.put(`/api/admin/species/${speciesId}`).send({ common_name: 'Test Ficus', category: 'tree', default_days_to_ready: 100, default_prime_days: 40, prime_window_override: '' });
    expect(await RuleSetting.count({ where: { species_id: speciesId } })).toBe(0);
    await admin.agent.delete(`/api/admin/species/${speciesId}`).set('X-CSRF-Token', admin.csrf).send({ reason: 'test' });
    expect((await op.get('/api/species')).body.species.map((s) => s.id)).not.toContain(speciesId);
    await admin.post(`/api/admin/species/${speciesId}/restore`);
    expect((await op.get('/api/species')).body.species.map((s) => s.id)).toContain(speciesId);
  });
});

describe('audit log (FR16)', () => {
  test('filters by entity type and pages', async () => {
    const res = await admin.get('/api/admin/audit?entity_type=plant_species');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(3);
    expect(res.body.items.every((i) => i.entity_type === 'plant_species')).toBe(true);
    expect(res.body.entity_types).toEqual(expect.arrayContaining(['user', 'nursery', 'plant_species']));
  });
});

describe('notifications (FR14)', () => {
  test('one row per event and recipient: the same event is never queued twice', async () => {
    await notify({ userId: opUserId, type: 'listing_expired', eventKey: 'test:event:1', payload: { species: 'Test' } });
    await notify({ userId: opUserId, type: 'listing_expired', eventKey: 'test:event:1', payload: { species: 'Test' } });
    expect(await Notification.count({ where: { event_key: 'test:event:1' } })).toBe(1);
  });

  test('in-app list with unread count; mark as read', async () => {
    const list = await op.get('/api/notifications');
    expect(list.body.unread).toBeGreaterThanOrEqual(2); // verification approved + the test event
    await op.post('/api/notifications/read').send({});
    expect((await op.get('/api/notifications')).body.unread).toBe(0);
  });

  test('a failed email stays visible to the administrator and can be retried', async () => {
    await dispatchPending();
    const row = await notify({ userId: opUserId, type: 'unknown_type', eventKey: 'test:event:bad', payload: {} });
    await dispatchPending();
    await row.reload();
    expect(row.status).toBe('failed');
    expect(row.last_error).toMatch(/template/);
    const failed = await admin.get('/api/admin/notifications/failed');
    expect(failed.body.notifications.map((n) => n.id)).toContain(row.id);
    expect((await admin.post(`/api/admin/notifications/${row.id}/retry`)).status).toBe(200);
  });
});

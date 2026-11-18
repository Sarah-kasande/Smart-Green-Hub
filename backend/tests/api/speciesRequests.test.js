// Species proposed by nurseries and approved by the administrator (docs/DEVIATIONS.md W39).
// Runs ONLY against the local test database (tests/guard.js refuses the live one). Fake accounts only.
const crypto = require('crypto');
const { Op } = require('sequelize');
const h = require('../helpers');
const { Batch, PlantSpecies, RiskAlert, Notification, AuditLog } = require('../../src/models');
const { todayKigali, addDays } = require('../../src/utils/dates');
const { dispatchPending } = require('../../src/services/notificationService');

let admin;
let adminId;
let op; // nursery A
let opB; // nursery B
let institution;
let species; // [TEST] approved species

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  adminId = (await admin.get('/api/auth/me')).body.user.id;
  species = await h.demoSpecies();
  op = (await h.approvedUser(admin, h.operatorData(h.uniqueEmail('species-op')))).client;
  opB = (await h.approvedUser(admin, h.operatorData(h.uniqueEmail('species-op-b')))).client;
  institution = (await h.approvedUser(admin, h.institutionData(h.uniqueEmail('species-school')))).client;
});
afterAll(() => h.sequelize.close());

const longAgo = () => addDays(todayKigali(), -300);
const propose = (client, name, extra = {}) =>
  client.post('/api/operator/batches').send({
    new_species: { common_name: name, category: 'tree', kinyarwanda_name: null, confirmed: true, ...extra.species },
    quantity: 50,
    planting_date: extra.planting_date || longAgo(),
    unit_price: 300,
    ...extra.batch,
  });

describe('a nursery proposes a species', () => {
  let res;
  test('the batch and a pending species are saved together; the batch has no dates yet', async () => {
    res = await propose(op, 'Test Umusave tree');
    expect(res.status).toBe(201);
    expect(res.body.batch).toMatchObject({ quantity_current: 50, expected_ready_date: null, prime_end_date: null, species_status: 'pending' });
    const row = await PlantSpecies.findByPk(res.body.batch.species_id);
    expect(row).toMatchObject({ status: 'pending', default_days_to_ready: null, default_prime_days: null });
    expect(await AuditLog.count({ where: { action: 'species.requested', entity_id: row.id } })).toBe(1);
  });

  test('a nursery cannot send growing rules with its proposal', async () => {
    const r = await propose(op, 'Test Rule sender', { batch: { days_to_ready: 5, prime_days: 5 } });
    const row = await PlantSpecies.findByPk(r.body.batch.species_id);
    expect(row.default_days_to_ready).toBeNull();
    expect(r.body.batch.expected_ready_date).toBeNull();
  });

  test('the administrator gets an in-app notification and an email (outbox)', async () => {
    const note = await Notification.findOne({ where: { user_id: adminId, type: 'species_requested' } });
    expect(note).not.toBeNull();
    expect(note.payload_json.species).toBe('Test Umusave tree');
    await dispatchPending();
    expect(h.sentEmails.some((m) => /New species request: Test Umusave tree/.test(m.subject))).toBe(true);
  });

  test('the pending species shows only to the nursery that proposed it, marked pending', async () => {
    const own = (await op.get('/api/species')).body.species.find((s) => s.common_name === 'Test Umusave tree');
    expect(own.status).toBe('pending');
    expect((await opB.get('/api/species')).body.species.some((s) => s.common_name === 'Test Umusave tree')).toBe(false);
    expect((await institution.get('/api/species')).body.species.every((s) => s.status === 'approved')).toBe(true);
  });

  test('the request appears in the queue with nursery, batch count and the menu count', async () => {
    const queue = await admin.get('/api/admin/species-requests');
    const item = queue.body.items.find((i) => i.common_name === 'Test Umusave tree');
    expect(item).toMatchObject({ status: 'pending', batch_count: 1, plant_count: 50 });
    expect(item.requestedBy.name).toBe('Test Nursery');
    expect((await admin.get('/api/admin/species-requests/count')).body.pending).toBeGreaterThanOrEqual(1);
  });
});

describe('duplicates (case, spaces and accents ignored)', () => {
  test('"Did you mean ...?" finds the same and similar names', async () => {
    const exact = await op.get('/api/operator/species/similar').query({ name: '  grevillea   ROBUSTA [test]' });
    expect(exact.body.exact).toMatchObject({ id: species[0].id });
    const similar = await op.get('/api/operator/species/similar').query({ name: 'Grevillea robusta' });
    expect(similar.body.exact).toBeNull();
    expect(similar.body.similar.map((s) => s.id)).toContain(species[0].id);
  });

  test('the same name as an approved species reuses it: no new request', async () => {
    const before = await PlantSpecies.count({ paranoid: false });
    const r = await propose(op, 'Rósa (ROSE) [test]');
    expect(r.status).toBe(201);
    expect(r.body.batch.species_id).toBe(species[5].id);
    expect(r.body.batch.expected_ready_date).not.toBeNull();
    expect(await PlantSpecies.count({ paranoid: false })).toBe(before);
  });

  test('a similar name is refused until the nursery confirms it is a new species', async () => {
    const refused = await propose(op, 'Jacaranda mimosifolia', { species: { confirmed: false } });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('SIMILAR_SPECIES');
    expect(refused.body.details.similar.map((s) => s.id)).toContain(species[1].id);
  });

  test('a second nursery proposing the same pending name joins the existing request', async () => {
    const before = await PlantSpecies.count({ where: { status: 'pending' } });
    const r = await propose(opB, 'test umusave TREE');
    expect(r.status).toBe(201);
    expect(await PlantSpecies.count({ where: { status: 'pending' } })).toBe(before);
    const first = await PlantSpecies.findOne({ where: { common_name: 'Test Umusave tree' } });
    expect(r.body.batch.species_id).toBe(first.id);
  });
});

describe('while pending, the batch counts in stock but is left out of the risk engine', () => {
  let batch;
  beforeAll(async () => {
    batch = (await propose(op, 'Test Pending only', { batch: { quantity: 40 } })).body.batch;
  });

  test('no alert, even though it was planted long ago', async () => {
    await op.post('/api/operator/alerts/evaluate');
    expect(await RiskAlert.count({ where: { batch_id: batch.id } })).toBe(0);
  });

  test('no planting suggestion and no Surplus Board listing', async () => {
    const planting = await op.get('/api/operator/planting');
    expect(planting.body.recommendations.some((r) => r.species_id === batch.species_id)).toBe(false);
    const listing = await op.post('/api/operator/listings').send({ batch_id: batch.id, quantity: 5, offer_type: 'free', expires_at: addDays(todayKigali(), 10) });
    expect(listing.status).toBe(409);
    expect(listing.body.code).toBe('SPECIES_NOT_APPROVED');
  });

  test('it is in the batch list with its stock', async () => {
    const list = (await op.get('/api/operator/batches')).body.batches;
    expect(list.find((b) => b.id === batch.id)).toMatchObject({ quantity_current: 40, species_status: 'pending', suggested_stage: null });
  });
});

describe('approval with rule entry', () => {
  let request;
  let batch;
  beforeAll(async () => {
    batch = (await propose(op, 'Test Approve me')).body.batch;
    request = await PlantSpecies.findByPk(batch.species_id);
  });

  test('the rules are required and validated', async () => {
    const res = await admin.post(`/api/admin/species-requests/${request.id}/approve`).send({ common_name: 'Test Approve me', category: 'tree', default_days_to_ready: 0 });
    expect(res.status).toBe(400);
    expect(res.body.details.fields).toMatchObject({ default_days_to_ready: 'invalid', default_prime_days: 'invalid' });
  });

  test('approving with the name of an approved species is refused (merge instead)', async () => {
    const res = await admin.post(`/api/admin/species-requests/${request.id}/approve`).send({ common_name: 'Grevillea robusta [TEST]', category: 'tree', default_days_to_ready: 100, default_prime_days: 30 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SPECIES_EXISTS');
  });

  test('approve: the batch gets dates from the rules; planted long ago it becomes overgrown', async () => {
    const res = await admin.post(`/api/admin/species-requests/${request.id}/approve`).send({ common_name: 'Test Approved tree', category: 'shrub', default_days_to_ready: 100, default_prime_days: 30 });
    expect(res.status).toBe(200);
    const after = await Batch.findByPk(batch.id);
    expect(after.expected_ready_date).toBe(addDays(batch.planting_date, 100));
    expect(after.prime_end_date).toBe(addDays(batch.planting_date, 130));
    expect(after.stage).toBe('overgrown');
    expect(await AuditLog.count({ where: { action: 'species.approved', entity_id: request.id } })).toBe(1);
    expect(await Notification.count({ where: { event_key: { [Op.like]: `species:${request.id}:species_approved:%` } } })).toBeGreaterThanOrEqual(1);
  });

  test('the batch joins the risk engine: its prime window ended, so a High alert', async () => {
    await op.post('/api/operator/alerts/evaluate');
    const alert = await RiskAlert.findOne({ where: { batch_id: batch.id } });
    expect(alert).toMatchObject({ risk_level: 'high', days_to_prime_end: 0 });
  });

  test('the species is now in every nursery\'s list, and cannot be decided twice', async () => {
    expect((await opB.get('/api/species')).body.species.some((s) => s.id === request.id && s.status === 'approved')).toBe(true);
    const again = await admin.post(`/api/admin/species-requests/${request.id}/reject`).send({ reason: 'x' });
    expect(again.body.code).toBe('ALREADY_DECIDED');
  });
});

describe('rejection', () => {
  let batch;
  let request;
  beforeAll(async () => {
    batch = (await propose(op, 'Test Not a plant')).body.batch;
    request = await PlantSpecies.findByPk(batch.species_id);
  });

  test('a reason is required', async () => {
    const res = await admin.post(`/api/admin/species-requests/${request.id}/reject`).send({ reason: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.details.fields.reason).toBe('required');
  });

  test('reject: stock is kept, the nursery is told why, the species disappears from its list', async () => {
    const res = await admin.post(`/api/admin/species-requests/${request.id}/reject`).send({ reason: 'Please use the existing species' });
    expect(res.status).toBe(200);
    expect((await Batch.findByPk(batch.id)).quantity_current).toBe(50);
    const note = await Notification.findOne({ where: { event_key: { [Op.like]: `species:${request.id}:species_rejected:%` } } });
    expect(note.payload_json.reason).toBe('Please use the existing species');
    expect((await op.get('/api/species')).body.species.some((s) => s.id === request.id)).toBe(false);
    const detail = await op.get(`/api/operator/batches/${batch.id}`);
    expect(detail.body.batch.species_status).toBe('rejected');
  });

  test('a rejected species cannot be used for a new batch', async () => {
    const res = await op.post('/api/operator/batches').send({ species_id: request.id, quantity: 5, planting_date: todayKigali(), unit_price: 0 });
    expect(res.body.code).toBe('SPECIES_REJECTED');
  });

  test('the nursery chooses another species: the batch gets its dates, nothing is lost', async () => {
    const res = await op.patch(`/api/operator/batches/${batch.id}/species`).send({ species_id: species[2].id });
    expect(res.status).toBe(200);
    expect(res.body.batch).toMatchObject({ species_id: species[2].id, quantity_current: 50, expected_ready_date: addDays(batch.planting_date, 180) });
    expect(await AuditLog.count({ where: { action: 'batch.species_changed', entity_id: batch.id } })).toBe(1);
    const locked = await op.patch(`/api/operator/batches/${batch.id}/species`).send({ species_id: species[3].id });
    expect(locked.body.code).toBe('SPECIES_LOCKED');
  });
});

describe('merge with an existing species', () => {
  let batch;
  let request;
  beforeAll(async () => {
    batch = (await propose(op, 'Test Jakarandaa tree')).body.batch;
    request = await PlantSpecies.findByPk(batch.species_id);
  });

  test('only an approved species can be the target', async () => {
    const res = await admin.post(`/api/admin/species-requests/${request.id}/merge`).send({ target_id: request.id });
    expect(res.status).toBe(400);
  });

  test('merge: the batches move to the approved species with its dates; the duplicate is archived', async () => {
    const res = await admin.post(`/api/admin/species-requests/${request.id}/merge`).send({ target_id: species[1].id, reason: 'Spelling' });
    expect(res.status).toBe(200);
    const after = await Batch.findByPk(batch.id);
    expect(after.species_id).toBe(species[1].id);
    expect(after.prime_end_date).toBe(addDays(batch.planting_date, 240));
    const merged = await PlantSpecies.findByPk(request.id, { paranoid: false });
    expect(merged).toMatchObject({ status: 'merged', merged_into_id: species[1].id });
    expect(merged.archived_at).not.toBeNull();
    expect(await AuditLog.count({ where: { action: 'species.merged', entity_id: request.id } })).toBe(1);
    expect(await Notification.count({ where: { event_key: { [Op.like]: `species:${request.id}:species_merged:%` } } })).toBeGreaterThanOrEqual(1);
  });

  test('the merged spelling later leads straight to the approved species', async () => {
    const r = await propose(opB, 'test jakarandaa TREE');
    expect(r.body.batch.species_id).toBe(species[1].id);
  });
});

describe('offline sync of a proposed species (client_uuid, idempotent)', () => {
  test('two offline batches with the same new name create ONE species request; a repeat is skipped', async () => {
    const one = crypto.randomUUID();
    const two = crypto.randomUUID();
    const data = (q) => ({ new_species: { common_name: 'Test Offline plant', category: 'flower' }, quantity: q, planting_date: todayKigali(), unit_price: 0 });
    const changes = [
      { client_uuid: one, type: 'batch', data: data(10) },
      { client_uuid: two, type: 'batch', data: data(20) },
    ];
    const first = await op.post('/api/operator/sync').send({ changes });
    expect(first.body.applied).toEqual([one, two]);
    expect(await PlantSpecies.count({ where: { common_name: 'Test Offline plant' } })).toBe(1);
    expect(first.body.server_changes.species.some((s) => s.common_name === 'Test Offline plant' && s.status === 'pending')).toBe(true);

    const second = await op.post('/api/operator/sync').send({ changes });
    expect(second.body.skipped).toEqual([one, two]);
    expect(await PlantSpecies.count({ where: { common_name: 'Test Offline plant' } })).toBe(1);
  });

  test('an invalid proposal is refused like an online one', async () => {
    const bad = [{ client_uuid: crypto.randomUUID(), type: 'batch', data: { new_species: { common_name: 'X', category: 'cactus' }, quantity: 5, planting_date: todayKigali() } }];
    const res = await op.post('/api/operator/sync').send({ changes: bad });
    expect(res.body.conflicts.map((c) => c.code)).toEqual(['VALIDATION_FAILED']);
  });
});

describe('permissions: only the administrator decides species and rules', () => {
  test('a nursery cannot open the queue, approve, edit species or change rules', async () => {
    const pending = await PlantSpecies.findOne({ where: { status: 'pending' } });
    expect((await op.get('/api/admin/species-requests')).status).toBe(403);
    expect((await op.post(`/api/admin/species-requests/${pending.id}/approve`).send({ common_name: 'x', category: 'tree', default_days_to_ready: 1, default_prime_days: 1 })).status).toBe(403);
    expect((await op.put(`/api/admin/species/${species[0].id}`).send({ common_name: 'x', category: 'tree', default_days_to_ready: 1, default_prime_days: 1 })).status).toBe(403);
    expect((await op.put('/api/admin/rules').send({ sales_lookback_days: 1, medium_risk_ratio: 0.1, high_risk_ratio: 0.2, safety_margin: 0, far_days: 2, near_days: 1 })).status).toBe(403);
    expect((await institution.get('/api/admin/species-requests')).status).toBe(403);
  });

  test('a pending species cannot be edited through the normal species form', async () => {
    const pending = await PlantSpecies.findOne({ where: { status: 'pending' } });
    const res = await admin.put(`/api/admin/species/${pending.id}`).send({ common_name: 'Sneaky', category: 'tree', default_days_to_ready: 10, default_prime_days: 10 });
    expect(res.status).toBe(404);
  });

  test('the administrator cannot add a second species with the same name', async () => {
    const res = await admin.post('/api/admin/species').send({ common_name: 'grevillea ROBUSTA [test]', category: 'tree', default_days_to_ready: 10, default_prime_days: 10 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SPECIES_EXISTS');
  });
});

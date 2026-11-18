// "Available plants" (docs/DEVIATIONS.md W42-W44): institutions see and request ready batches,
// using the same request lifecycle as surplus offers. Runs ONLY against the local test database
// (tests/guard.js refuses the live one). Fake accounts and [TEST] species only.
const h = require('../helpers');
const { Batch, Nursery, SurplusRequest, ImpactRecord, AuditLog } = require('../../src/models');
const { todayKigali, addDays } = require('../../src/utils/dates');

let admin;
let op;
let opNurseryId;
let opB;
let opBNurseryId;
let school;
let church;
let species;

const inDays = (n) => addDays(todayKigali(), n);
const newBatch = (client, overrides = {}) =>
  client.post('/api/operator/batches').send({ species_id: species[0].id, quantity: 100, planting_date: inDays(-200), unit_price: 0, stage: 'ready', ...overrides }).then((r) => r.body.batch);
const available = async (client, query = '') => (await client.get(`/api/institution/available-plants${query}`)).body.plants || [];
const find = async (batchId, client = school) => (await available(client)).find((p) => p.id === batchId);
const ask = (client, batchId, body = {}) => client.post(`/api/institution/available-plants/${batchId}/requests`).send({ quantity: 10, purpose: 'Trees for the school fence', ...body });

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  species = await h.demoSpecies();
  const a = await h.approvedUser(admin, h.operatorData(h.uniqueEmail('avail-op'), { nursery: { name: 'Avail Test Nursery', district: 'Kicukiro', sector: 'Kanombe' } }));
  op = a.client;
  opNurseryId = a.id;
  const b = await h.approvedUser(admin, h.operatorData(h.uniqueEmail('avail-op-b'), { nursery: { name: 'Second Test Nursery', district: 'Gasabo', sector: 'Remera' } }));
  opB = b.client;
  opBNurseryId = b.id;
  school = (await h.approvedUser(admin, h.institutionData(h.uniqueEmail('avail-school')))).client;
  church = (await h.approvedUser(admin, h.institutionData(h.uniqueEmail('avail-church'), { institution: { org_name: 'Test Church', org_type: 'church', district: 'Nyarugenge', sector: 'Nyamirambo' } }))).client;
});
afterAll(() => h.sequelize.close());

describe('which batches institutions see', () => {
  test('a ready batch is shown with only the allowed details', async () => {
    const batch = await newBatch(op, { unit_price: 250 });
    const item = await find(batch.id);
    expect(item).toMatchObject({ available: 100, unit_price: 250, species: { id: species[0].id }, nursery: { name: 'Avail Test Nursery', district: 'Kicukiro', sector: 'Kanombe' } });
    expect(item.available_from).toBe(todayKigali());
    // Never: total stock, stage, risk, sales or the phone number
    const text = JSON.stringify(item);
    for (const hidden of ['quantity_current', 'quantity_initial', 'stage', 'risk', 'phone', 'sales', 'email']) expect(text).not.toContain(hidden);
  });

  test('no price is shown when the nursery entered none', async () => {
    const batch = await newBatch(op, { unit_price: 0 });
    expect((await find(batch.id)).unit_price).toBeNull();
  });

  test('a batch that is still growing is not shown; an overgrown one is', async () => {
    const growing = await newBatch(op, { stage: 'growing' });
    const overgrown = await newBatch(op, { stage: 'overgrown' });
    expect(await find(growing.id)).toBeUndefined();
    expect(await find(overgrown.id)).toBeDefined();
  });

  test('"Show to institutions" OFF on a batch hides it; ON shows it again', async () => {
    const batch = await newBatch(op);
    await op.patch(`/api/operator/batches/${batch.id}`).send({ show_to_institutions: false });
    expect(await find(batch.id)).toBeUndefined();
    expect(await AuditLog.count({ where: { entity_type: 'batch', entity_id: batch.id, reason: 'hidden from institutions' } })).toBe(1);
    await op.patch(`/api/operator/batches/${batch.id}`).send({ show_to_institutions: true });
    expect(await find(batch.id)).toBeDefined();
  });

  test('a batch created with "Show to institutions" off is hidden from the start', async () => {
    const batch = await newBatch(op, { show_to_institutions: false });
    expect(batch.show_to_institutions).toBe(false);
    expect(await find(batch.id)).toBeUndefined();
  });

  test('the whole-nursery switch in Settings hides every batch of the nursery', async () => {
    const batch = await newBatch(opB);
    expect(await find(batch.id)).toBeDefined();
    const off = await opB.put('/api/operator/visibility').send({ show_available_plants: false });
    expect(off.body.show_available_plants).toBe(false);
    expect((await available(school)).some((p) => p.nursery.id === opBNurseryId)).toBe(false);
    expect(await AuditLog.count({ where: { action: 'nursery.visibility_changed', entity_id: opBNurseryId } })).toBe(1);
    expect((await opB.get('/api/auth/me')).body.organisation.show_available_plants).toBe(false);
    await opB.put('/api/operator/visibility').send({ show_available_plants: true });
    expect(await find(batch.id)).toBeDefined();
  });

  test('a nursery that is no longer approved is not shown', async () => {
    const batch = await newBatch(opB);
    await Nursery.update({ verification_status: 'pending' }, { where: { id: opBNurseryId } });
    expect(await find(batch.id)).toBeUndefined();
    await Nursery.update({ verification_status: 'approved' }, { where: { id: opBNurseryId } });
  });

  test('a batch waiting for species approval never appears', async () => {
    const res = await op.post('/api/operator/batches').send({
      new_species: { common_name: 'Test Waiting plant', category: 'tree', confirmed: true },
      quantity: 30,
      planting_date: inDays(-200),
      unit_price: 0,
      stage: 'ready',
    });
    expect(await find(res.body.batch.id)).toBeUndefined();
  });

  test('filters: district, plant type, species and minimum quantity', async () => {
    const batch = await newBatch(op, { quantity: 15 });
    expect((await available(school, '?district=Gasabo')).some((p) => p.id === batch.id)).toBe(false);
    expect((await available(school, '?district=Kicukiro')).some((p) => p.id === batch.id)).toBe(true);
    expect((await available(school, '?category=flower')).some((p) => p.id === batch.id)).toBe(false);
    expect((await available(school, `?species_id=${species[0].id}`)).some((p) => p.id === batch.id)).toBe(true);
    expect((await available(school, '?min_quantity=16')).some((p) => p.id === batch.id)).toBe(false);
  });
});

describe('only the truly free quantity is shown and requestable', () => {
  test('plants on a surplus listing and plants in open requests are not counted', async () => {
    const batch = await newBatch(op);
    await op.post('/api/operator/listings').send({ batch_id: batch.id, quantity: 30, offer_type: 'free', expires_at: inDays(10) });
    expect((await find(batch.id)).available).toBe(70);
    expect((await ask(school, batch.id, { quantity: 20 })).status).toBe(201);
    expect((await find(batch.id, church)).available).toBe(50);
    // The nursery cannot sell the reserved plants either
    const sale = await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 51 });
    expect(sale.body).toMatchObject({ code: 'SALE_EXCEEDS_STOCK', details: { available: 50 } });
    // Asking for more than is free is refused
    const tooMany = await ask(church, batch.id, { quantity: 51 });
    expect(tooMany.body).toMatchObject({ code: 'NOT_ENOUGH_LEFT', details: { remaining: 50 } });
  });

  test('a batch with nothing free disappears', async () => {
    const batch = await newBatch(op, { quantity: 10 });
    await ask(school, batch.id, { quantity: 10 });
    expect(await find(batch.id, church)).toBeUndefined();
  });

  test('two institutions racing for the last plants: only one gets them', async () => {
    const batch = await newBatch(op, { quantity: 10 });
    const [first, second] = await Promise.all([ask(school, batch.id, { quantity: 10 }), ask(church, batch.id, { quantity: 10 })]);
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
    expect([first.body.code, second.body.code]).toContain('NOT_ENOUGH_LEFT');
    expect(await SurplusRequest.count({ where: { batch_id: batch.id, status: 'pending' } })).toBe(1);
  });
});

describe('the same request lifecycle as surplus offers', () => {
  let batch;
  let requestId;

  test('request with pickup date and message; one request per institution and batch', async () => {
    batch = await newBatch(op, { quantity: 60, unit_price: 300 });
    const res = await ask(school, batch.id, { quantity: 25, preferred_pickup_date: inDays(5), message: 'We can come on Saturday' });
    expect(res.status).toBe(201);
    requestId = res.body.request.id;
    const again = await ask(school, batch.id, { quantity: 5 });
    expect(again.status).toBe(200);
    expect(again.body.duplicate).toBe(true);
    expect(await SurplusRequest.count({ where: { batch_id: batch.id } })).toBe(1);
  });

  test('the nursery sees it in the same Requests list, marked "Available plant"', async () => {
    const list = (await op.get('/api/operator/requests?status=pending')).body.requests;
    expect(list.find((r) => r.id === requestId)).toMatchObject({ source: 'available_plant', batch_id: batch.id, listing_id: null, quantity_requested: 25, preferred_pickup_date: inDays(5), message: 'We can come on Saturday', unit_price: 300 });
    expect((await op.get('/api/operator/dashboard')).body.pending_requests).toBeGreaterThanOrEqual(1);
    expect(await AuditLog.count({ where: { action: 'request.created', entity_id: requestId, reason: 'available_plant' } })).toBe(1);
  });

  test('another nursery cannot see or decide it', async () => {
    expect((await opB.get('/api/operator/requests?status=all')).body.requests.some((r) => r.id === requestId)).toBe(false);
    expect((await opB.post(`/api/operator/requests/${requestId}/decision`).send({ decision: 'approve' })).status).toBe(404);
  });

  test('decline with a reason releases the plants; the same institution can ask again', async () => {
    await op.post(`/api/operator/requests/${requestId}/decision`).send({ decision: 'decline', reason: 'Reserved for a school order' });
    expect((await find(batch.id)).available).toBe(60);
    const reopened = await ask(school, batch.id, { quantity: 25 });
    expect(reopened.status).toBe(201);
    expect(reopened.body.request.id).toBe(requestId); // the unique pair is reopened, not duplicated
  });

  test('hiding the batch does not cancel the open request, but blocks new ones', async () => {
    await op.patch(`/api/operator/batches/${batch.id}`).send({ show_to_institutions: false });
    expect((await SurplusRequest.findByPk(requestId)).status).toBe('pending');
    expect((await ask(church, batch.id)).body.code).toBe('NOT_AVAILABLE');
    await op.patch(`/api/operator/batches/${batch.id}`).send({ show_to_institutions: true });
  });

  test('a batch with an open request cannot be archived', async () => {
    const res = await op.agent.delete(`/api/operator/batches/${batch.id}`).set('X-CSRF-Token', op.csrf).send({ reason: 'test' });
    expect(res.body.code).toBe('BATCH_HAS_LISTINGS');
  });

  test('approve, then stock goes down only after BOTH sides confirm', async () => {
    await op.post(`/api/operator/requests/${requestId}/decision`).send({ decision: 'approve' });
    const mine = (await school.get('/api/institution/requests?status=approved')).body.requests.find((r) => r.id === requestId);
    expect(mine.nursery.contact_name).toBeTruthy(); // contact shared after approval
    await op.post(`/api/operator/requests/${requestId}/confirm`).send({ land_cleared_sqm: 0 });
    expect((await Batch.findByPk(batch.id)).quantity_current).toBe(60);
    const done = await school.post(`/api/institution/requests/${requestId}/confirm`).send({ planting_site: 'School fence, Remera' });
    expect(done.body.completed).toBe(true);
    expect((await Batch.findByPk(batch.id)).quantity_current).toBe(35);
    expect((await SurplusRequest.findByPk(requestId)).status).toBe('fulfilled');
  });
});

describe('impact keeps surplus and greening supply apart', () => {
  test('healthy ready stock counts as "supplied for greening", never as surplus redirected', async () => {
    const record = await ImpactRecord.findOne({ order: [['id', 'DESC']] });
    expect(record.impact_type).toBe('greening_supply');
    const summary = (await op.get('/api/operator/impact')).body.summary;
    expect(summary).toMatchObject({ plants_redirected: 0, plants_supplied: 25, plants_total: 25 });
    const pub = await (await h.newClient()).get('/api/public/impact');
    expect(pub.body).toMatchObject({ plants_redirected: 0, plants_supplied: 25 });
    const records = (await admin.get('/api/admin/impact')).body.records;
    expect(records[0]).toMatchObject({ impact_type: 'greening_supply', quantity_delivered: 25 });
  });

  test('an overgrown batch handed over through Available plants counts as surplus redirected', async () => {
    const batch = await newBatch(op, { quantity: 12, stage: 'overgrown' });
    const { body } = await ask(church, batch.id, { quantity: 12 });
    await op.post(`/api/operator/requests/${body.request.id}/decision`).send({ decision: 'approve' });
    await op.post(`/api/operator/requests/${body.request.id}/confirm`).send({ land_cleared_sqm: 3 });
    await church.post(`/api/institution/requests/${body.request.id}/confirm`).send({ planting_site: 'Church yard' });
    expect((await ImpactRecord.findOne({ where: { request_id: body.request.id } })).impact_type).toBe('surplus_redirected');
    const summary = (await admin.get('/api/admin/impact')).body.summary;
    expect(summary).toMatchObject({ plants_redirected: 12, plants_supplied: 25, plants_total: 37 });
    expect((await Batch.findByPk(batch.id)).stage).toBe('cleared'); // stock reached zero
  });
});

describe('permissions', () => {
  test('only approved institutions can see or request available plants', async () => {
    const anonymous = await h.newClient();
    expect((await anonymous.get('/api/institution/available-plants')).status).toBe(401);
    expect((await op.get('/api/institution/available-plants')).status).toBe(403);
    expect((await admin.get('/api/institution/available-plants')).status).toBe(403);
    const unapproved = await h.registerVerifiedUser(h.institutionData(h.uniqueEmail('avail-unapproved')));
    expect((await unapproved.get('/api/institution/available-plants')).status).toBe(403);
    const batch = await newBatch(op);
    expect((await unapproved.post(`/api/institution/available-plants/${batch.id}/requests`).send({ quantity: 1, purpose: 'x' })).status).toBe(403);
    expect((await ask(school, 999999)).status).toBe(404);
  });

  test('the public directory still shows no stock', async () => {
    await Nursery.update({ is_listed: true }, { where: { id: opNurseryId } });
    const res = await (await h.newClient()).get('/api/public/directory');
    const text = JSON.stringify(res.body);
    expect(text).toContain('Avail Test Nursery');
    for (const hidden of ['available', 'quantity', 'species', 'unit_price']) expect(text).not.toContain(hidden);
  });
});

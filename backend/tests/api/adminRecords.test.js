// Administrator record management (docs/DEVIATIONS.md W47): permissions, safe edits, archive (with open
// requests released and history kept), unarchive, and permanent delete only when nothing is linked.
// Runs ONLY against the local test database (tests/guard.js refuses the live one). Fake accounts and
// [TEST] species only.
const h = require('../helpers');
const { Batch, Nursery, Institution, User, SurplusRequest, SurplusListing, StockAdjustment, Notification, AuditLog } = require('../../src/models');
const { todayKigali, addDays } = require('../../src/utils/dates');

let admin;
let species;
let op;
let opData;
let nurseryId;
let school;
let schoolData;
let institutionId;

const inDays = (n) => addDays(todayKigali(), n);
const newBatch = (client, overrides = {}) =>
  client.post('/api/operator/batches').send({ species_id: species[0].id, quantity: 100, planting_date: inDays(-200), unit_price: 200, stage: 'ready', ...overrides }).then((r) => r.body.batch);
const del = (client, path, body) => client.agent.delete(path).set('X-CSRF-Token', client.csrf).send(body);
const signIn = async (data) => (await h.newClient()).post('/api/auth/login').send({ email: data.email, password: data.password });

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  species = await h.demoSpecies();
  opData = h.operatorData(h.uniqueEmail('rec-op'), { nursery: { name: 'Records Nursery', district: 'Kicukiro', sector: 'Kanombe' } });
  const a = await h.approvedUser(admin, opData);
  op = a.client;
  nurseryId = a.id;
  schoolData = h.institutionData(h.uniqueEmail('rec-school'), { institution: { org_name: 'Records School', org_type: 'school', district: 'Gasabo', sector: 'Remera' } });
  const s = await h.approvedUser(admin, schoolData);
  school = s.client;
  institutionId = s.id;
});
afterAll(() => h.sequelize.close());

describe('permissions: only the administrator', () => {
  test('operators, institutions and visitors cannot list or change records', async () => {
    const anonymous = await h.newClient();
    for (const path of ['/api/admin/nurseries', '/api/admin/institutions', '/api/admin/batches']) {
      expect((await anonymous.get(path)).status).toBe(401);
      expect((await op.get(path)).status).toBe(403);
      expect((await school.get(path)).status).toBe(403);
    }
    expect((await op.post(`/api/admin/nurseries/${nurseryId}/archive`).send({ reason: 'x' })).status).toBe(403);
    expect((await school.post('/api/admin/batches/publish').send({ ids: [1] })).status).toBe(403);
    expect((await del(op, `/api/admin/institutions/${institutionId}`, { reason: 'x' })).status).toBe(403);
  });
});

describe('lists, counts and safe edits', () => {
  test('lists have Active / Archived / All counts and search', async () => {
    const res = await admin.get('/api/admin/nurseries?status=all');
    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ active: 1, archived: 0, all: 1 });
    expect(res.body.items[0]).toMatchObject({ name: 'Records Nursery', owner: { email: opData.email } });
    expect((await admin.get('/api/admin/institutions')).body.items.map((i) => i.name)).toEqual(['Records School']);
  });

  test('editing a nursery changes only safe fields and is audited', async () => {
    const res = await admin.patch(`/api/admin/nurseries/${nurseryId}`).send({ name: 'Records Nursery Ltd', owner_phone: '+250788111222', verification_status: 'rejected', reason: 'Name on the licence' });
    expect(res.status).toBe(200);
    expect(res.body.item).toMatchObject({ name: 'Records Nursery Ltd', verification_status: 'approved', owner: { phone: '+250788111222' } });
    const log = await AuditLog.findOne({ where: { action: 'nursery.edited', entity_id: nurseryId } });
    expect(log.reason).toContain('changed: name, owner phone');
    expect(log.reason).toContain('Name on the licence');
    expect((await admin.patch(`/api/admin/nurseries/${nurseryId}`).send({ district: 'Musanze' })).status).toBe(400);
  });

  test('a batch quantity correction needs a reason, is saved as a stock change and cannot go below what is promised', async () => {
    const batch = await newBatch(op);
    expect((await admin.patch(`/api/admin/batches/${batch.id}`).send({ quantity_change: -5 })).body.details.fields.reason).toBe('required');
    const ok = await admin.patch(`/api/admin/batches/${batch.id}`).send({ quantity_change: -5, reason: 'Plants died in the rain' });
    expect(ok.body.item.quantity_current).toBe(95);
    expect(await StockAdjustment.count({ where: { batch_id: batch.id, quantity_change: -5 } })).toBe(1);
    await op.post('/api/operator/listings').send({ batch_id: batch.id, quantity: 90, offer_type: 'free', expires_at: inDays(10) });
    expect((await admin.patch(`/api/admin/batches/${batch.id}`).send({ quantity_change: -10, reason: 'Count' })).body.code).toBe('STOCK_TOO_LOW');
  });
});

describe('archive and unarchive a batch', () => {
  let batch;
  let offerRequest;
  let directRequest;

  test('a reason is required', async () => {
    batch = await newBatch(op, { quantity: 80 });
    expect((await admin.post(`/api/admin/batches/${batch.id}/archive`).send({})).status).toBe(400);
  });

  test('archiving cancels open requests, withdraws listings, keeps sales and tells everyone', async () => {
    await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 5 });
    const listing = (await op.post('/api/operator/listings').send({ batch_id: batch.id, quantity: 20, offer_type: 'free', expires_at: inDays(10) })).body.listing;
    offerRequest = (await school.post(`/api/institution/listings/${listing.id}/requests`).send({ quantity: 10, purpose: 'School garden' })).body.request;
    directRequest = (await school.post(`/api/institution/available-plants/${batch.id}/requests`).send({ quantity: 10, purpose: 'Fence' })).body.request;

    const res = await admin.post(`/api/admin/batches/${batch.id}/archive`).send({ reason: 'Duplicate batch' });
    expect(res.status).toBe(200);
    expect(res.body.released).toEqual({ listingsWithdrawn: 1, requestsCancelled: 2 });
    expect((await SurplusListing.findByPk(listing.id)).status).toBe('withdrawn');
    for (const id of [offerRequest.id, directRequest.id]) expect((await SurplusRequest.findByPk(id)).status).toBe('cancelled');

    // Gone from the nursery's batches, Available plants and the admin's active list; history stays
    expect((await op.get('/api/operator/batches')).body.batches.some((b) => b.id === batch.id)).toBe(false);
    expect((await school.get('/api/institution/available-plants')).body.plants.some((p) => p.id === batch.id)).toBe(false);
    expect((await admin.get('/api/admin/batches?status=archived')).body.items.map((b) => b.id)).toContain(batch.id);
    expect((await admin.get('/api/admin/sales?period=all')).body.totals.plants).toBeGreaterThanOrEqual(5);
    const history = (await school.get('/api/institution/requests')).body.requests;
    expect(history.filter((r) => [offerRequest.id, directRequest.id].includes(r.id)).every((r) => r.status === 'cancelled' && r.species)).toBe(true);

    // The institution and the nursery were told (in-app + email outbox)
    const schoolUser = await User.findOne({ where: { email: schoolData.email } });
    expect(await Notification.count({ where: { user_id: schoolUser.id, type: 'request_decided' } })).toBe(2);
    const owner = await User.findOne({ where: { email: opData.email } });
    expect(await Notification.count({ where: { user_id: owner.id, type: 'record_archived' } })).toBe(1);
    expect((await AuditLog.findOne({ where: { action: 'batch.archived', entity_id: batch.id } })).reason).toContain('Duplicate batch');
  });

  test('archiving twice is refused; unarchive restores the batch but cancelled requests stay cancelled', async () => {
    expect((await admin.post(`/api/admin/batches/${batch.id}/archive`).send({ reason: 'again' })).body.code).toBe('ALREADY_ARCHIVED');
    expect((await admin.post(`/api/admin/batches/${batch.id}/unarchive`).send({ reason: 'Mistake' })).status).toBe(200);
    expect((await op.get('/api/operator/batches')).body.batches.some((b) => b.id === batch.id)).toBe(true);
    expect((await SurplusRequest.findByPk(directRequest.id)).status).toBe('cancelled');
    const owner = await User.findOne({ where: { email: opData.email } });
    expect(await Notification.count({ where: { user_id: owner.id, type: 'record_restored' } })).toBe(1);
  });
});

describe('delete only when nothing is linked', () => {
  test('a batch with sales cannot be deleted: HAS_HISTORY lists what is linked', async () => {
    const batch = await newBatch(op);
    await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 2 });
    const res = await del(admin, `/api/admin/batches/${batch.id}`, { reason: 'Test' });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'HAS_HISTORY', details: { links: { sales: 1 } } });
    expect(await Batch.findByPk(batch.id)).not.toBeNull();
  });

  test('a reason is required, and a batch with nothing linked is deleted permanently (the audit log keeps it)', async () => {
    const batch = await newBatch(op);
    expect((await del(admin, `/api/admin/batches/${batch.id}`, {})).status).toBe(400);
    expect((await del(admin, `/api/admin/batches/${batch.id}`, { reason: 'Entered twice' })).status).toBe(200);
    expect(await Batch.findByPk(batch.id, { paranoid: false })).toBeNull();
    expect((await AuditLog.findOne({ where: { action: 'batch.deleted', entity_id: batch.id } })).reason).toContain('Entered twice');
  });

  test('a nursery with batches cannot be deleted; an institution without requests can, and its account is erased', async () => {
    expect((await del(admin, `/api/admin/nurseries/${nurseryId}`, { reason: 'Test' })).body.code).toBe('HAS_HISTORY');
    const lonelyData = h.institutionData(h.uniqueEmail('rec-lonely'), { institution: { org_name: 'Lonely Hotel', org_type: 'hotel', district: 'Nyarugenge', sector: 'Nyamirambo' } });
    const lonely = await h.approvedUser(admin, lonelyData);
    expect((await del(admin, `/api/admin/institutions/${lonely.id}`, { reason: 'Registered by mistake' })).status).toBe(200);
    expect(await Institution.findByPk(lonely.id, { paranoid: false })).toBeNull();
    expect(await User.findOne({ where: { email: lonelyData.email }, paranoid: false })).toBeNull(); // name and email erased
    expect((await signIn(lonelyData)).status).toBe(401);
    expect(await AuditLog.count({ where: { action: 'institution.deleted', entity_id: lonely.id } })).toBe(1);
  });
});

describe('archive and unarchive a nursery or an institution', () => {
  let openRequest;

  test('an archived institution cannot sign in; its open requests are cancelled and the nursery told; history stays', async () => {
    const batch = await newBatch(op, { species_id: species[1].id });
    openRequest = (await school.post(`/api/institution/available-plants/${batch.id}/requests`).send({ quantity: 5, purpose: 'Hedge' })).body.request;
    expect((await admin.post(`/api/admin/institutions/${institutionId}/archive`).send({ reason: 'School closed' })).status).toBe(200);
    expect((await SurplusRequest.findByPk(openRequest.id)).status).toBe('cancelled');
    const owner = await User.findOne({ where: { email: opData.email } });
    expect(await Notification.count({ where: { user_id: owner.id, type: 'request_cancelled' } })).toBeGreaterThanOrEqual(1);
    // Signed out at once, and cannot sign in again
    expect((await school.get('/api/institution/requests')).status).toBe(401);
    expect((await signIn(schoolData)).body.code).toBe('ACCOUNT_ARCHIVED');
    // The nursery still sees the request with the institution's name
    const forNursery = (await op.get('/api/operator/requests')).body.requests.find((r) => r.id === openRequest.id);
    expect(forNursery.institution.name).toBe('Records School');
    expect((await admin.post(`/api/admin/institutions/${institutionId}/unarchive`).send({})).status).toBe(200);
    expect((await signIn(schoolData)).status).toBe(200);
  });

  test('an archived nursery cannot sign in and disappears from the directory and Available plants; history stays', async () => {
    await Nursery.update({ is_listed: true }, { where: { id: nurseryId } });
    expect(JSON.stringify((await (await h.newClient()).get('/api/public/directory')).body)).toContain('Records Nursery');
    school = (await h.newClient());
    await school.post('/api/auth/login').send({ email: schoolData.email, password: schoolData.password });

    expect((await admin.post(`/api/admin/nurseries/${nurseryId}/archive`).send({ reason: 'Closed the business' })).status).toBe(200);
    expect((await op.get('/api/operator/dashboard')).status).toBe(401);
    expect((await signIn(opData)).body.code).toBe('ACCOUNT_ARCHIVED');
    expect(JSON.stringify((await (await h.newClient()).get('/api/public/directory')).body)).not.toContain('Records Nursery');
    expect((await school.get('/api/institution/available-plants')).body.plants).toEqual([]);
    expect((await school.get('/api/board')).body.listings).toEqual([]);
    // The institution's history still names the nursery; reports still count its sales
    const history = (await school.get('/api/institution/requests')).body.requests;
    expect(history.length).toBeGreaterThan(0);
    expect(history.every((r) => r.nursery?.name === 'Records Nursery Ltd')).toBe(true);
    expect((await admin.get('/api/admin/sales?period=all')).body.by_nursery.map((n) => n.id)).toContain(nurseryId);
    expect((await admin.get('/api/admin/nurseries')).body.counts).toEqual({ active: 0, archived: 1, all: 1 });

    expect((await admin.post(`/api/admin/nurseries/${nurseryId}/unarchive`).send({ reason: 'Reopened' })).status).toBe(200);
    expect((await signIn(opData)).status).toBe(200);
  });
});

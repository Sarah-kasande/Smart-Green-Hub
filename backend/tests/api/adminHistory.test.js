// Administrator history never disappears (docs/DEVIATIONS.md W46):
//  - Species requests open on ALL, with counts, and decided requests keep who decided, when and why
//  - Listings and plants: listings of every status by default, and the "Available plants" view lists
//    every batch of every approved nursery with stock, free quantity, price and visibility
// Runs ONLY against the local test database (tests/guard.js refuses the live one). Fake accounts and
// [TEST] species only.
const h = require('../helpers');
const { Nursery } = require('../../src/models');
const { todayKigali, addDays } = require('../../src/utils/dates');

let admin;
let op;
let nurseryId;
let pendingOp;
let species;

const inDays = (n) => addDays(todayKigali(), n);
const newBatch = (client, overrides = {}) =>
  client.post('/api/operator/batches').send({ species_id: species[0].id, quantity: 100, planting_date: inDays(-200), unit_price: 0, stage: 'ready', ...overrides }).then((r) => r.body.batch);
const propose = (name) =>
  op.post('/api/operator/batches').send({ new_species: { common_name: name, category: 'tree', kinyarwanda_name: null, confirmed: true }, quantity: 20, planting_date: inDays(-30), unit_price: 0 });

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  species = await h.demoSpecies();
  const a = await h.approvedUser(admin, h.operatorData(h.uniqueEmail('hist-op'), { nursery: { name: 'History Nursery', district: 'Kicukiro', sector: 'Kanombe' } }));
  op = a.client;
  nurseryId = a.id;
  // A nursery that is NOT approved: its batches never appear in the administrator's plants list
  pendingOp = await h.registerVerifiedUser(h.operatorData(h.uniqueEmail('hist-pending'), { nursery: { name: 'Unapproved Nursery', district: 'Gasabo', sector: 'Remera' } }));
});
afterAll(() => h.sequelize.close());

describe('species requests: ALL by default, decided ones stay visible', () => {
  test('approved, rejected and pending requests are all listed by default, with counts', async () => {
    await propose('Test History Approve');
    await propose('Test History Reject');
    await propose('Test History Pending');
    const first = (await admin.get('/api/admin/species-requests')).body;
    const id = (name) => first.items.find((i) => i.common_name === name).id;

    await admin.post(`/api/admin/species-requests/${id('Test History Approve')}/approve`).send({ common_name: 'Test History Approve', category: 'tree', default_days_to_ready: 100, default_prime_days: 30 });
    await admin.post(`/api/admin/species-requests/${id('Test History Reject')}/reject`).send({ reason: 'Not a plant we track' });

    const res = await admin.get('/api/admin/species-requests'); // no status: everything
    expect(res.body.items.map((i) => i.status).sort()).toEqual(['approved', 'pending', 'rejected']);
    expect(res.body.counts).toEqual({ pending: 1, approved: 1, rejected: 1, merged: 0, all: 3 });
    const rejected = res.body.items.find((i) => i.status === 'rejected');
    expect(rejected.decision_reason).toBe('Not a plant we track');
    expect(rejected.decided_at).toBeTruthy();
    expect(rejected.decidedBy.full_name).toBeTruthy();
    expect(res.body.items.find((i) => i.status === 'approved').decidedBy).toBeTruthy();
    // Newest first
    expect(res.body.items[0].common_name).toBe('Test History Pending');
    // Filters still work
    expect((await admin.get('/api/admin/species-requests?status=rejected')).body.items).toHaveLength(1);
    expect((await admin.get('/api/admin/species-requests?status=pending')).body.items).toHaveLength(1);
  });
});

describe('listings and plants', () => {
  let ready;
  let growing;
  let hidden;

  test('listings of every status are returned by default, and filter by nursery and species', async () => {
    const batch = await newBatch(op);
    const active = (await op.post('/api/operator/listings').send({ batch_id: batch.id, quantity: 10, offer_type: 'free', expires_at: inDays(10) })).body.listing;
    const gone = (await op.post('/api/operator/listings').send({ batch_id: batch.id, quantity: 5, offer_type: 'free', expires_at: inDays(10) })).body.listing;
    await op.post(`/api/operator/listings/${gone.id}/withdraw`).send({ reason: 'Sold at the market' });

    const all = (await admin.get('/api/admin/listings')).body.listings;
    expect(all.map((l) => [l.id, l.status]).sort()).toEqual([[active.id, 'active'], [gone.id, 'withdrawn']].sort());
    expect((await admin.get(`/api/admin/listings?nursery_id=${nurseryId}`)).body.listings).toHaveLength(2);
    expect((await admin.get(`/api/admin/listings?species_id=${species[1].id}`)).body.listings).toHaveLength(0);
    expect((await admin.get('/api/admin/listings?status=withdrawn')).body.listings.map((l) => l.id)).toEqual([gone.id]);
  });

  test('every batch of every approved nursery is listed with stock, free quantity, price and visibility', async () => {
    ready = await newBatch(op, { species_id: species[1].id, unit_price: 300 });
    growing = await newBatch(op, { species_id: species[2].id, stage: 'growing', planting_date: inDays(-10) });
    hidden = await newBatch(op, { species_id: species[3].id, show_to_institutions: false });
    await op.post('/api/operator/listings').send({ batch_id: ready.id, quantity: 30, offer_type: 'free', expires_at: inDays(10) });
    // The unapproved nursery cannot even add batches; its nursery never shows here
    expect((await pendingOp.post('/api/operator/batches').send({ species_id: species[0].id, quantity: 5, planting_date: inDays(-200) })).status).toBe(403);

    const plants = (await admin.get('/api/admin/plants')).body.plants;
    expect(plants.every((p) => p.nursery.id === nurseryId)).toBe(true);
    const byId = (id) => plants.find((p) => p.id === id);
    expect(byId(ready.id)).toMatchObject({ stage: 'ready', quantity_current: 100, free: 70, unit_price: 300, visible: true, show_to_institutions: true, nursery: { name: 'History Nursery', district: 'Kicukiro' } });
    expect(byId(growing.id)).toMatchObject({ stage: 'growing', free: 100, unit_price: null, visible: false });
    expect(byId(hidden.id)).toMatchObject({ stage: 'ready', show_to_institutions: false, visible: false });
    // Never: sales, expenses or risk
    for (const word of ['sales', 'expenses', 'risk']) expect(JSON.stringify(plants)).not.toContain(word);
  });

  test('filters: stage, species, nursery and shown / hidden', async () => {
    const ids = async (query) => (await admin.get(`/api/admin/plants${query}`)).body.plants.map((p) => p.id);
    // (the batches of the proposed species above may be growing too)
    const growingRows = (await admin.get('/api/admin/plants?stage=growing')).body.plants;
    expect(growingRows.map((p) => p.id)).toContain(growing.id);
    expect(growingRows.every((p) => p.stage === 'growing')).toBe(true);
    expect(await ids(`?species_id=${species[1].id}`)).toEqual([ready.id]);
    expect(await ids('?visibility=hidden')).toEqual(expect.arrayContaining([growing.id, hidden.id]));
    expect(await ids('?visibility=hidden')).not.toContain(ready.id);
    expect(await ids('?visibility=shown')).toContain(ready.id);
    // The nursery switch in Settings hides all of its plants
    await Nursery.update({ show_available_plants: false }, { where: { id: nurseryId } });
    const off = (await admin.get(`/api/admin/plants?nursery_id=${nurseryId}`)).body.plants.find((p) => p.id === ready.id);
    expect(off).toMatchObject({ visible: false, nursery_shows: false });
    expect((await admin.get('/api/admin/plants?stage=decade')).status).toBe(400);
  });

  test('only the administrator can see these lists and the filter choices', async () => {
    for (const path of ['/api/admin/plants', '/api/admin/listings', '/api/admin/filter-options']) {
      expect((await op.get(path)).status).toBe(403);
    }
    const options = (await admin.get('/api/admin/filter-options')).body;
    expect(options.nurseries.some((n) => n.name === 'History Nursery')).toBe(true);
    expect(options.species.length).toBeGreaterThan(0);
  });
});

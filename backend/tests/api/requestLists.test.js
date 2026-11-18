// Requests pages with BOTH kinds of request: a surplus offer (through a listing) and an available plant
// (directly on a batch). Regression test for the production error
//   SequelizeDatabaseError: Not unique table/alias: 'batch->species'
// that broke GET /api/operator/requests and /api/institution/requests once a request could reach a batch
// and its species by two paths (see the comment above speciesInclude in src/services/surplusService.js).
// Runs ONLY against the local test database (tests/guard.js refuses the live one). Fake accounts and
// [TEST] species only.
const h = require('../helpers');
const { todayKigali, addDays } = require('../../src/utils/dates');

let admin;
let op;
let school;
let species;
let offerRequestId;
let plantRequestId;

const inDays = (n) => addDays(todayKigali(), n);
const newBatch = (overrides = {}) =>
  op.post('/api/operator/batches').send({ species_id: species[0].id, quantity: 100, planting_date: inDays(-200), unit_price: 0, stage: 'ready', ...overrides }).then((r) => r.body.batch);

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  species = await h.demoSpecies();
  op = (await h.approvedUser(admin, h.operatorData(h.uniqueEmail('lists-op'), { nursery: { name: 'Lists Test Nursery', district: 'Kicukiro', sector: 'Kanombe' } }))).client;
  school = (await h.approvedUser(admin, h.institutionData(h.uniqueEmail('lists-school')))).client;
});
afterAll(() => h.sequelize.close());

test('with no requests yet, both lists answer 200 with an empty list (the page shows its empty state)', async () => {
  for (const [client, path] of [[op, '/api/operator/requests?status=all'], [school, '/api/institution/requests?status=all']]) {
    const res = await client.get(path);
    expect(res.status).toBe(200);
    expect(res.body.requests).toEqual([]);
  }
});

test('the nursery and the institution list a surplus-offer request and an available-plant request together', async () => {
  // 1. A surplus offer: a listing on one batch, requested by the school
  const offerBatch = await newBatch({ species_id: species[0].id });
  const listing = (await op.post('/api/operator/listings').send({ batch_id: offerBatch.id, quantity: 40, offer_type: 'free', expires_at: inDays(14) })).body.listing;
  const offer = await school.post(`/api/institution/listings/${listing.id}/requests`).send({ quantity: 15, purpose: 'School garden' });
  expect(offer.status).toBe(201);
  offerRequestId = offer.body.request.id;

  // 2. An available plant: another ready batch (a different species), requested directly
  const plantBatch = await newBatch({ species_id: species[1].id, unit_price: 300 });
  const plant = await school.post(`/api/institution/available-plants/${plantBatch.id}/requests`).send({ quantity: 10, purpose: 'Trees along the fence', message: 'Saturday morning' });
  expect(plant.status).toBe(201);
  plantRequestId = plant.body.request.id;

  // 3. The nursery's list: both, each with its source, species, quantity, nursery and institution
  const forOp = await op.get('/api/operator/requests?status=all');
  expect(forOp.status).toBe(200);
  expect(forOp.body.requests).toHaveLength(2);
  const opOffer = forOp.body.requests.find((r) => r.id === offerRequestId);
  const opPlant = forOp.body.requests.find((r) => r.id === plantRequestId);
  expect(opOffer).toMatchObject({
    source: 'surplus_offer', listing_id: listing.id, batch_id: null, species: species[0].common_name, quantity_requested: 15,
    status: 'pending', offer_type: 'free', nursery: { name: 'Lists Test Nursery', district: 'Kicukiro' },
  });
  expect(opPlant).toMatchObject({
    source: 'available_plant', listing_id: null, batch_id: plantBatch.id, species: species[1].common_name, quantity_requested: 10,
    status: 'pending', unit_price: 300, message: 'Saturday morning', nursery: { name: 'Lists Test Nursery', district: 'Kicukiro' },
  });
  for (const r of [opOffer, opPlant]) expect(r.institution.name).toBeTruthy();

  // 4. The institution's list: the same two requests, same shape
  const forSchool = await school.get('/api/institution/requests?status=all');
  expect(forSchool.status).toBe(200);
  expect(forSchool.body.requests.map((r) => [r.id, r.source]).sort()).toEqual(
    [[offerRequestId, 'surplus_offer'], [plantRequestId, 'available_plant']].sort(),
  );
  for (const r of forSchool.body.requests) {
    expect(r.species).toBeTruthy();
    expect(r.nursery.name).toBe('Lists Test Nursery');
    // Before approval the institution does not get the nursery's phone
    expect(r.nursery.contact_phone).toBeNull();
  }

  // 5. The status filter and the dashboard count work with both kinds
  expect((await op.get('/api/operator/requests?status=pending')).body.requests).toHaveLength(2);
  expect((await op.get('/api/operator/requests?status=approved')).body.requests).toEqual([]);
});

test('approve, decline and confirm work on both kinds (each loads the request with both batch paths)', async () => {
  expect((await op.post(`/api/operator/requests/${offerRequestId}/decision`).send({ decision: 'approve' })).status).toBe(200);
  expect((await op.post(`/api/operator/requests/${plantRequestId}/decision`).send({ decision: 'decline', reason: 'Batch promised to a hotel' })).status).toBe(200);

  expect((await op.post(`/api/operator/requests/${offerRequestId}/confirm`).send({ land_cleared_sqm: 2 })).status).toBe(200);
  expect((await school.post(`/api/institution/requests/${offerRequestId}/confirm`).send({ planting_site: 'School garden' })).status).toBe(200);

  const forSchool = (await school.get('/api/institution/requests?status=all')).body.requests;
  expect(forSchool.find((r) => r.id === offerRequestId)).toMatchObject({ source: 'surplus_offer', status: 'fulfilled' });
  expect(forSchool.find((r) => r.id === plantRequestId)).toMatchObject({ source: 'available_plant', status: 'declined', decision_reason: 'Batch promised to a hotel' });

  // Impact and the admin views still load with both kinds present
  expect((await op.get('/api/operator/impact')).status).toBe(200);
  expect((await school.get('/api/institution/impact')).status).toBe(200);
  expect((await admin.get('/api/admin/impact')).status).toBe(200);
  expect((await admin.get('/api/admin/listings')).status).toBe(200);
});

// Phase 4: Surplus Board, listings, requests, two-sided hand-over and impact (FR09-FR12),
// plus the public directory and aggregate impact (FR03).
const h = require('../helpers');
const { Batch, SurplusListing, SurplusRequest, ImpactRecord, Nursery } = require('../../src/models');
const { todayKigali, addDays } = require('../../src/utils/dates');
const { expireListings } = require('../../src/services/surplusService');

let admin;
let op;
let school;
let church;
let species;
let batch;

const inDays = (n) => addDays(todayKigali(), n);

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  species = await h.demoSpecies();
  const operator = await h.approvedUser(admin, h.operatorData(h.uniqueEmail('op'), { nursery: { name: 'Kabeza Test Nursery', district: 'Kicukiro', sector: 'Kanombe', is_listed: true } }));
  op = operator.client;
  school = (await h.approvedUser(admin, h.institutionData(h.uniqueEmail('school'), { institution: { org_name: 'Test School', org_type: 'school', district: 'Gasabo', sector: 'Remera' } }))).client;
  church = (await h.approvedUser(admin, h.institutionData(h.uniqueEmail('church'), { institution: { org_name: 'Test Church', org_type: 'church', district: 'Nyarugenge', sector: 'Nyamirambo' } }))).client;
  batch = (await op.post('/api/operator/batches').send({ species_id: species[0].id, quantity: 100, planting_date: inDays(-200), unit_price: 500, stage: 'ready' })).body.batch;
});
afterAll(() => h.sequelize.close());

const listing = (overrides = {}) =>
  op.post('/api/operator/listings').send({ batch_id: batch.id, quantity: 40, offer_type: 'free', pickup_note: 'Gate B, mornings', expires_at: inDays(14), ...overrides });

describe('listings (FR09)', () => {
  test('a listing larger than the available stock is refused', async () => {
    const res = await listing({ quantity: 101 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('LISTING_EXCEEDS_STOCK');
  });

  test('a discounted offer needs a price; the expiry cannot be in the past', async () => {
    expect((await listing({ offer_type: 'discounted' })).body.details.fields.discounted_price).toBe('invalid_amount');
    expect((await listing({ expires_at: inDays(-1) })).status).toBe(400);
  });

  let listingId;
  test('plants on the board cannot also be sold', async () => {
    const res = await listing();
    expect(res.status).toBe(201);
    listingId = res.body.listing.id;
    // 100 in stock, 40 promised on the board -> only 60 can be sold
    const sale = await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 61 });
    expect(sale.body).toMatchObject({ code: 'SALE_EXCEEDS_STOCK', details: { available: 60 } });
  });

  test('the board shows it to approved institutions, with filters', async () => {
    const board = await school.get('/api/board');
    expect(board.status).toBe(200);
    expect(board.body.listings.find((l) => l.id === listingId)).toMatchObject({ remaining: 40, offer_type: 'free', nursery: { name: 'Kabeza Test Nursery', district: 'Kicukiro' } });
    expect((await school.get('/api/board?district=Gasabo')).body.listings).toHaveLength(0);
  });

  test('institutions that are not approved cannot browse the board', async () => {
    const pending = await h.registerVerifiedUser(h.institutionData(h.uniqueEmail('pending-school')));
    expect((await pending.get('/api/board')).status).toBe(403);
  });
});

describe('requests and hand-over (FR10, FR11, FR12)', () => {
  let listingId;
  let requestId;

  beforeAll(async () => {
    listingId = (await SurplusListing.findOne({ where: { batch_id: batch.id, status: 'active' } })).id;
  });

  test('a request reserves plants; a repeat returns the same request', async () => {
    const res = await school.post(`/api/institution/listings/${listingId}/requests`).send({ quantity: 25, purpose: 'School garden' });
    expect(res.status).toBe(201);
    requestId = res.body.request.id;
    const again = await school.post(`/api/institution/listings/${listingId}/requests`).send({ quantity: 10, purpose: 'again' });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ duplicate: true, request: { id: requestId, quantity_requested: 25 } });
    const board = await church.get('/api/board');
    expect(board.body.listings.find((l) => l.id === listingId).remaining).toBe(15);
  });

  test('nobody can request more than what is left', async () => {
    const res = await church.post(`/api/institution/listings/${listingId}/requests`).send({ quantity: 16, purpose: 'Church yard' });
    expect(res.body).toMatchObject({ code: 'NOT_ENOUGH_LEFT', details: { remaining: 15 } });
  });

  test('two institutions asking for the last plants at the same moment: only one gets them', async () => {
    const extra = (await h.approvedUser(admin, h.institutionData(h.uniqueEmail('hotel'), { institution: { org_name: 'Test Hotel', org_type: 'hotel', district: 'Gasabo', sector: 'Kimihurura' } }))).client;
    const [a, b] = await Promise.all([
      church.post(`/api/institution/listings/${listingId}/requests`).send({ quantity: 15, purpose: 'Church yard' }),
      extra.post(`/api/institution/listings/${listingId}/requests`).send({ quantity: 15, purpose: 'Hotel garden' }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect((await SurplusListing.findByPk(listingId)).status).toBe('reserved'); // nothing left to request
    // Release the winner's request again for the next tests
    const winner = a.status === 201 ? church : extra;
    const winnerRequest = a.status === 201 ? a.body.request.id : b.body.request.id;
    expect((await winner.post(`/api/institution/requests/${winnerRequest}/cancel`).send({ reason: 'test' })).status).toBe(200);
    expect((await SurplusListing.findByPk(listingId)).status).toBe('active');
  });

  test('the operator sees the request; contact details are hidden from the institution until approval', async () => {
    const forOp = await op.get('/api/operator/requests');
    expect(forOp.body.requests.find((r) => r.id === requestId)).toMatchObject({ status: 'pending', institution: { name: 'Test School' } });
    const forSchool = await school.get('/api/institution/requests');
    expect(forSchool.body.requests[0].nursery.contact_phone).toBeNull();
  });

  test('hand-over cannot be confirmed before approval', async () => {
    const res = await op.post(`/api/operator/requests/${requestId}/confirm`).send({ land_cleared_sqm: 12 });
    expect(res.body.code).toBe('NOT_APPROVED_YET');
  });

  test('approve -> nursery confirms -> stock NOT reduced yet -> institution confirms -> stock reduced, impact recorded', async () => {
    expect((await op.post(`/api/operator/requests/${requestId}/decision`).send({ decision: 'approve' })).status).toBe(200);

    const first = await op.post(`/api/operator/requests/${requestId}/confirm`).send({ land_cleared_sqm: 12.5 });
    expect(first.body.completed).toBe(false);
    expect((await Batch.findByPk(batch.id)).quantity_current).toBe(100); // only one side confirmed
    expect(await ImpactRecord.count()).toBe(0);

    const second = await school.post(`/api/institution/requests/${requestId}/confirm`).send({ planting_site: 'Remera Primary School garden' });
    expect(second.body.completed).toBe(true);
    expect((await Batch.findByPk(batch.id)).quantity_current).toBe(75);
    expect((await SurplusRequest.findByPk(requestId)).status).toBe('fulfilled');
    const impact = await ImpactRecord.findOne({ where: { request_id: requestId } });
    expect(impact).toMatchObject({ quantity_delivered: 25, planting_site: 'Remera Primary School garden', district: 'Gasabo' });
    expect(Number(impact.land_cleared_sqm)).toBe(12.5);
  });

  test('after the hand-over: 40 offered - 25 given = 15 still promised, so 60 can be sold', async () => {
    const sale = await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 61 });
    expect(sale.body.details.available).toBe(60);
  });

  test('decline releases the reserved plants', async () => {
    const req = await church.post(`/api/institution/listings/${listingId}/requests`).send({ quantity: 15, purpose: 'Church yard' });
    expect(req.status).toBe(201); // a closed request is reopened (unique listing + institution)
    expect((await SurplusListing.findByPk(listingId)).status).toBe('reserved');
    await op.post(`/api/operator/requests/${req.body.request.id}/decision`).send({ decision: 'decline', reason: 'Batch reserved for a school' });
    expect((await SurplusListing.findByPk(listingId)).status).toBe('active');
    const forChurch = await church.get('/api/institution/requests');
    expect(forChurch.body.requests[0]).toMatchObject({ status: 'declined', decision_reason: 'Batch reserved for a school' });
  });

  test('impact dashboards: institution, nursery, administrator and public (aggregates only)', async () => {
    const forSchool = await school.get('/api/institution/impact');
    expect(forSchool.body.summary).toMatchObject({ plants_redirected: 25, handovers: 1, planting_sites: 1 });
    expect((await op.get('/api/operator/impact')).body.summary.plants_redirected).toBe(25);
    expect((await admin.get('/api/admin/impact')).body.records[0]).toMatchObject({ institution: 'Test School' });

    const anonymous = await h.newClient();
    const pub = await anonymous.get('/api/public/impact');
    expect(pub.body).toMatchObject({ plants_redirected: 25, handovers: 1, land_cleared_sqm: 12.5 });
    expect(JSON.stringify(pub.body)).not.toContain('Test School'); // no names in public figures
  });
});

describe('withdraw and expiry', () => {
  test('withdrawing a listing cancels its open requests', async () => {
    const l = (await listing({ quantity: 10 })).body.listing;
    const r = await school.post(`/api/institution/listings/${l.id}/requests`).send({ quantity: 5, purpose: 'Trees' });
    await op.post(`/api/operator/listings/${l.id}/withdraw`).send({ reason: 'Sold at the market' });
    expect((await SurplusListing.findByPk(l.id)).status).toBe('withdrawn');
    expect((await SurplusRequest.findByPk(r.body.request.id)).status).toBe('cancelled');
  });

  test('the nightly job expires old listings and cancels their requests (F6)', async () => {
    const l = (await listing({ quantity: 5 })).body.listing;
    const r = await school.post(`/api/institution/listings/${l.id}/requests`).send({ quantity: 5, purpose: 'Trees' });
    await SurplusListing.update({ expires_at: inDays(-1) }, { where: { id: l.id } });
    expect(await expireListings()).toBeGreaterThanOrEqual(1);
    expect((await SurplusListing.findByPk(l.id)).status).toBe('expired');
    expect((await SurplusRequest.findByPk(r.body.request.id)).status).toBe('cancelled');
  });

  test('administrators can moderate (withdraw) a listing with a reason', async () => {
    const l = (await listing({ quantity: 5 })).body.listing;
    expect((await admin.post(`/api/admin/listings/${l.id}/withdraw`).send({})).status).toBe(400); // reason required
    expect((await admin.post(`/api/admin/listings/${l.id}/withdraw`).send({ reason: 'Duplicate listing' })).status).toBe(200);
  });
});

describe('nursery map pin (FR03)', () => {
  test('a pin inside Rwanda is saved; one outside is refused', async () => {
    const ok = await op.put('/api/me/organisation').send({ name: 'Kabeza Test Nursery', district: 'Kicukiro', sector: 'Kanombe', is_listed: true, latitude: -1.9706, longitude: 30.1044 });
    expect(ok.status).toBe(200);
    expect(ok.body.organisation).toMatchObject({ latitude: -1.9706, longitude: 30.1044 });
    const bad = await op.put('/api/me/organisation').send({ name: 'Kabeza Test Nursery', district: 'Kicukiro', sector: 'Kanombe', latitude: 48.85, longitude: 2.35 });
    expect(bad.body.details.fields.latitude).toBe('invalid_location');
  });
});

describe('public directory (FR03)', () => {
  test('lists only approved nurseries that agreed to be listed, without risk data', async () => {
    await h.approvedUser(admin, h.operatorData(h.uniqueEmail('hidden-op'), { nursery: { name: 'Hidden Nursery', district: 'Gasabo', sector: 'Kacyiru', is_listed: false } }));
    const anonymous = await h.newClient();
    const res = await anonymous.get('/api/public/directory');
    const names = res.body.nurseries.map((n) => n.name);
    expect(names).toContain('Kabeza Test Nursery');
    expect(names).not.toContain('Hidden Nursery');
    expect(res.body.nurseries[0]).not.toHaveProperty('verification_status');
    expect(res.body.nurseries[0]).not.toHaveProperty('review_note');
    expect(await Nursery.count()).toBeGreaterThan(res.body.nurseries.length);
  });
});

// Public homepage "Plants available now" (docs/DEVIATIONS.md W48): nursery consent, who may publish,
// exactly which fields the public endpoint exposes, quantities that follow stock, batches that disappear
// by themselves, the featured position, filters and the rate limit.
// Runs ONLY against the local test database (tests/guard.js refuses the live one). Fake accounts and
// [TEST] species only.
const h = require('../helpers');
const { Batch, AuditLog } = require('../../src/models');
const { todayKigali, addDays } = require('../../src/utils/dates');

let admin;
let species;
let op;
let nurseryId;
let opB;

const inDays = (n) => addDays(todayKigali(), n);
const newBatch = (client, overrides = {}) =>
  client.post('/api/operator/batches').send({ species_id: species[0].id, quantity: 50, planting_date: inDays(-190), unit_price: 400, stage: 'ready', ...overrides }).then((r) => r.body.batch);
const publish = (ids) => admin.post('/api/admin/batches/publish').send({ ids });
const homepage = async (query = '') => (await (await h.newClient()).get(`/api/public/plants${query}`)).body.plants;

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  species = await h.demoSpecies();
  const a = await h.approvedUser(admin, h.operatorData(h.uniqueEmail('home-op'), { nursery: { name: 'Homepage Nursery', district: 'Kicukiro', sector: 'Kanombe', address_text: 'Secret street 4' } }));
  op = a.client;
  nurseryId = a.id;
  opB = (await h.approvedUser(admin, h.operatorData(h.uniqueEmail('home-op-b'), { nursery: { name: 'Second Nursery', district: 'Gasabo', sector: 'Remera' } }))).client;
});
afterAll(() => h.sequelize.close());

describe('nursery consent', () => {
  test('is OFF by default, and the administrator cannot publish without it', async () => {
    expect((await op.get('/api/auth/me')).body.organisation.show_on_homepage).toBe(false);
    const batch = await newBatch(op);
    const res = await publish([batch.id]);
    expect(res.body).toEqual({ published: [], blocked: [{ id: batch.id, code: 'NURSERY_NO_CONSENT' }] });
    expect(await homepage()).toEqual([]);
  });

  test('with consent, a ready batch can be published, and the change is audited', async () => {
    const consent = await op.put('/api/operator/homepage').send({ show_on_homepage: true });
    expect(consent.body.show_on_homepage).toBe(true);
    expect(await AuditLog.count({ where: { action: 'nursery.homepage_consent', entity_id: nurseryId } })).toBe(1);
  });
});

describe('the public endpoint', () => {
  let batch;

  test('exposes ONLY species, plant type, quantity available, price, prime-window end, nursery name and district', async () => {
    batch = await newBatch(op);
    expect((await publish([batch.id])).body.published).toEqual([batch.id]);
    expect(await AuditLog.count({ where: { action: 'batch.published', entity_id: batch.id } })).toBe(1);
    const res = await (await h.newClient()).get('/api/public/plants');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('max-age=60');
    const [card] = res.body.plants;
    expect(Object.keys(card).sort()).toEqual(['available', 'category', 'nursery', 'prime_end_date', 'prime_progress', 'species', 'unit_price']);
    expect(Object.keys(card.nursery).sort()).toEqual(['district', 'name']);
    expect(Object.keys(card.species).sort()).toEqual(['kinyarwanda_name', 'name']);
    expect(card).toMatchObject({ available: 50, unit_price: 400, category: 'tree', nursery: { name: 'Homepage Nursery', district: 'Kicukiro' } });
    const text = JSON.stringify(res.body);
    for (const hidden of ['phone', 'email', 'Kanombe', 'Secret street', 'latitude', 'longitude', 'quantity_current', 'risk', 'sales', 'client_uuid', '"id"']) {
      expect(text).not.toContain(hidden);
    }
  });

  test('the quantity follows stock: sales and listings lower it; sold out removes the card', async () => {
    await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 10 });
    expect((await homepage())[0].available).toBe(40);
    await op.post('/api/operator/listings').send({ batch_id: batch.id, quantity: 15, offer_type: 'free', expires_at: inDays(10) });
    expect((await homepage())[0].available).toBe(25);
    await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 25 });
    expect(await homepage()).toEqual([]);
  });

  test('a batch that is no longer ready, unpublished or archived disappears by itself', async () => {
    const b = await newBatch(op);
    await publish([b.id]);
    expect(await homepage()).toHaveLength(1);
    await op.patch(`/api/operator/batches/${b.id}`).send({ stage: 'overgrown' });
    expect(await homepage()).toEqual([]);
    await op.patch(`/api/operator/batches/${b.id}`).send({ stage: 'ready' });
    expect(await homepage()).toHaveLength(1);
    await admin.post('/api/admin/batches/unpublish').send({ ids: [b.id] });
    expect(await homepage()).toEqual([]);
    await publish([b.id]);
    await admin.post(`/api/admin/batches/${b.id}/archive`).send({ reason: 'Test archive' });
    expect(await homepage()).toEqual([]);
  });

  test('blocked batches say why: not ready, waiting species, other nursery without consent', async () => {
    const growing = await newBatch(op, { stage: 'growing', planting_date: inDays(-10) });
    const proposed = (
      await op.post('/api/operator/batches').send({ new_species: { common_name: 'Test Homepage Pending', category: 'tree', kinyarwanda_name: null, confirmed: true }, quantity: 20, planting_date: inDays(-200), unit_price: 0 })
    ).body.batch;
    const other = await newBatch(opB);
    const res = (await publish([growing.id, proposed.id, other.id, 999999])).body;
    expect(res.published).toEqual([]);
    expect(Object.fromEntries(res.blocked.map((b) => [b.id, b.code]))).toEqual({
      [growing.id]: 'NOT_READY',
      [proposed.id]: 'SPECIES_NOT_APPROVED',
      [other.id]: 'NURSERY_NO_CONSENT',
      999999: 'NOT_FOUND',
    });
  });

  test('featured position: 1 comes first; then the newest published', async () => {
    const first = await newBatch(op, { species_id: species[1].id });
    const second = await newBatch(op, { species_id: species[2].id });
    await publish([first.id]);
    await publish([second.id]);
    expect((await homepage()).map((p) => p.species.name).slice(0, 2)).toEqual([species[2].common_name, species[1].common_name]);
    expect((await admin.put(`/api/admin/batches/${first.id}/featured`).send({ featured_rank: 1 })).status).toBe(200);
    expect((await homepage())[0].species.name).toBe(species[1].common_name);
  });

  test('filters by plant type and district', async () => {
    expect((await homepage('?category=flower'))).toEqual([]);
    expect((await homepage('?district=Gasabo'))).toEqual([]);
    expect((await homepage('?district=Kicukiro')).length).toBeGreaterThan(0);
    expect((await (await h.newClient()).get('/api/public/plants?district=Musanze')).status).toBe(400);
  });

  test('withdrawing consent takes every batch of the nursery off the homepage at once', async () => {
    expect((await homepage()).length).toBeGreaterThan(0);
    await op.put('/api/operator/homepage').send({ show_on_homepage: false });
    expect(await homepage()).toEqual([]);
    expect(await Batch.count({ where: { nursery_id: nurseryId, published_at: { [require('sequelize').Op.ne]: null } }, paranoid: false })).toBe(0);
  });

  test('an archived nursery disappears from the homepage', async () => {
    await op.put('/api/operator/homepage').send({ show_on_homepage: true });
    const b = await newBatch(op, { species_id: species[3].id });
    await publish([b.id]);
    expect(await homepage()).toHaveLength(1);
    await admin.post(`/api/admin/nurseries/${nurseryId}/archive`).send({ reason: 'Test archive' });
    expect(await homepage()).toEqual([]);
    await admin.post(`/api/admin/nurseries/${nurseryId}/unarchive`).send({});
    expect(await homepage()).toHaveLength(1); // unarchive restores everything
  });
});

describe('permissions and rate limit', () => {
  test('only the administrator can publish or set the featured position', async () => {
    // (opB: the first operator was signed out when the administrator archived its nursery above)
    expect((await opB.post('/api/admin/batches/publish').send({ ids: [1] })).status).toBe(403);
    expect((await opB.put('/api/admin/batches/1/featured').send({ featured_rank: 1 })).status).toBe(403);
    expect((await (await h.newClient()).post('/api/admin/batches/publish').send({ ids: [1] })).status).toBe(401);
  });

  test('the public endpoint is rate-limited', async () => {
    process.env.TEST_RATE_LIMITS = 'on';
    try {
      const visitor = await h.newClient();
      let last;
      for (let i = 0; i < 31; i++) last = await visitor.get('/api/public/plants');
      expect(last.status).toBe(429);
    } finally {
      delete process.env.TEST_RATE_LIMITS;
    }
  });
});

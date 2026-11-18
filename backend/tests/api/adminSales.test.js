// Admin Sales page (docs/DEVIATIONS.md W45): totals, period filters, permissions, offline-synced sales,
// removed sales and the CSV export with its audit row.
// Runs ONLY against the local test database (tests/guard.js refuses the live one). Fake accounts and
// [TEST] species only.
const crypto = require('crypto');
const h = require('../helpers');
const { Sale, AuditLog } = require('../../src/models');
const { todayKigali, kigaliDayStart } = require('../../src/utils/dates');

let admin;
let opA;
let opB;
let nurseryA;
let nurseryB;
let species;
let batchA;
let batchB;
let saleToday;
let saleOld;
let saleB;

// 1 January of LAST year at noon Kigali: outside today / week / month / year, inside "all"
const OLD_DAY = `${Number(todayKigali().slice(0, 4)) - 1}-01-01`;
const oldNoon = () => new Date(kigaliDayStart(OLD_DAY).getTime() + 12 * 3600 * 1000).toISOString();
const sales = (query = '') => admin.get(`/api/admin/sales${query}`);
const newBatch = (client, speciesId, quantity = 1000) =>
  client.post('/api/operator/batches').send({ species_id: speciesId, quantity, planting_date: '2025-01-01', unit_price: 500 }).then((r) => r.body.batch);

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  species = await h.demoSpecies();
  const a = await h.approvedUser(admin, h.operatorData(h.uniqueEmail('sales-op-a'), { nursery: { name: 'Sales Nursery A', district: 'Kicukiro', sector: 'Kanombe' } }));
  const b = await h.approvedUser(admin, h.operatorData(h.uniqueEmail('sales-op-b'), { nursery: { name: 'Sales Nursery B', district: 'Gasabo', sector: 'Remera' } }));
  opA = a.client;
  nurseryA = a.id;
  opB = b.client;
  nurseryB = b.id;
  batchA = await newBatch(opA, species[0].id);
  batchB = await newBatch(opB, species[1].id);
});
afterAll(() => h.sequelize.close());

describe('permissions', () => {
  test('only the administrator can open the sales page or export it', async () => {
    const anonymous = await h.newClient();
    const institution = (await h.approvedUser(admin, h.institutionData(h.uniqueEmail('sales-school')))).client;
    for (const path of ['/api/admin/sales', '/api/admin/sales/export']) {
      expect((await anonymous.get(path)).status).toBe(401);
      expect((await opA.get(path)).status).toBe(403);
      expect((await institution.get(path)).status).toBe(403);
    }
    expect(await AuditLog.count({ where: { action: 'sales.exported' } })).toBe(0);
  });
});

describe('totals are calculated on the server from the sales rows', () => {
  test('with no sales every total is 0', async () => {
    const res = await sales('?period=all');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totals: { amount: 0, sales: 0, plants: 0 }, rows: [], by_nursery: [], by_species: [] });
  });

  test('sales of every nursery are counted, with breakdowns by nursery and by species', async () => {
    saleToday = (await opA.post('/api/operator/sales').send({ batch_id: batchA.id, quantity: 10, unit_price: 500, customer_note: 'Paid by MoMo' })).body.sale;
    saleOld = (await opA.post('/api/operator/sales').send({ batch_id: batchA.id, quantity: 4, unit_price: 250, sold_at: oldNoon() })).body.sale;
    saleB = (await opB.post('/api/operator/sales').send({ batch_id: batchB.id, quantity: 3, unit_price: 1000 })).body.sale;

    const all = (await sales('?period=all')).body;
    expect(all.totals).toEqual({ amount: 5000 + 1000 + 3000, sales: 3, plants: 17 });
    expect(all.by_nursery).toEqual([
      expect.objectContaining({ id: nurseryA, name: 'Sales Nursery A', amount: 6000, sales: 2, plants: 14 }),
      expect.objectContaining({ id: nurseryB, name: 'Sales Nursery B', amount: 3000, sales: 1, plants: 3 }),
    ]);
    expect(all.by_species.map((s) => [s.id, s.amount])).toEqual([[species[0].id, 6000], [species[1].id, 3000]]);
    // Newest first, with every column the table shows
    expect(all.rows[all.rows.length - 1].id).toBe(saleOld.id);
    expect(all.rows.find((r) => r.id === saleToday.id)).toMatchObject({
      quantity: 10, unit_price: 500, total: 5000, customer_note: 'Paid by MoMo',
      nursery: { id: nurseryA, name: 'Sales Nursery A', district: 'Kicukiro' }, species: { id: species[0].id },
    });
  });

  test('period filters: today, week, month and year leave out last year; custom picks exact days', async () => {
    for (const period of ['today', 'week', 'month', 'year']) {
      const res = (await sales(`?period=${period}`)).body;
      expect(res.totals).toEqual({ amount: 8000, sales: 2, plants: 13 });
      expect(res.to).toBe(todayKigali());
    }
    const old = (await sales(`?period=custom&from=${OLD_DAY}&to=${OLD_DAY}`)).body;
    expect(old.totals).toEqual({ amount: 1000, sales: 1, plants: 4 });
    expect(old.rows.map((r) => r.id)).toEqual([saleOld.id]);
    // The default period is this month
    expect((await sales()).body).toMatchObject({ period: 'month', totals: { sales: 2 } });
  });

  test('nursery, species and search filters change the totals too', async () => {
    expect((await sales(`?period=all&nursery_id=${nurseryB}`)).body.totals).toEqual({ amount: 3000, sales: 1, plants: 3 });
    expect((await sales(`?period=all&species_id=${species[0].id}`)).body.totals).toEqual({ amount: 6000, sales: 2, plants: 14 });
    expect((await sales('?period=all&q=momo')).body.totals).toEqual({ amount: 5000, sales: 1, plants: 10 });
    expect((await sales('?period=all&q=Nursery%20B')).body.rows.map((r) => r.id)).toEqual([saleB.id]);
  });

  test('invalid filters are refused', async () => {
    expect((await sales('?period=decade')).status).toBe(400);
    expect((await sales('?period=custom&from=2026-02-10&to=2026-02-01')).body.details.fields.to).toBe('invalid_range');
  });

  test('a sale removed by the nursery (mistake or refund) is no longer counted', async () => {
    const removed = await opB.agent.delete(`/api/operator/sales/${saleB.id}`).set('X-CSRF-Token', opB.csrf).send({ reason: 'Customer returned the plants' });
    expect(removed.status).toBe(200);
    const res = (await sales('?period=all')).body;
    expect(res.totals).toEqual({ amount: 6000, sales: 2, plants: 14 });
    expect(res.by_nursery.some((n) => n.id === nurseryB)).toBe(false);
  });

  test('a sale synced from an offline phone appears like any other sale', async () => {
    const uuid = crypto.randomUUID();
    const sync = await opB.post('/api/operator/sync').send({ changes: [{ client_uuid: uuid, type: 'sale', data: { batch_id: batchB.id, quantity: 2, unit_price: 700 } }] });
    expect(sync.body.applied).toEqual([uuid]);
    // Sent again (the phone missed the answer): still counted once
    await opB.post('/api/operator/sync').send({ changes: [{ client_uuid: uuid, type: 'sale', data: { batch_id: batchB.id, quantity: 2, unit_price: 700 } }] });
    const res = (await sales(`?period=today&nursery_id=${nurseryB}`)).body;
    expect(res.totals).toEqual({ amount: 1400, sales: 1, plants: 2 });
    expect(res.rows[0]).toMatchObject({ quantity: 2, unit_price: 700, total: 1400 });
  });

  test('totals cover every matching sale, not only the 500 rows shown', async () => {
    const rows = Array.from({ length: 505 }, () => ({
      batch_id: batchA.id, nursery_id: nurseryA, quantity: 1, unit_price: 100, sold_at: new Date(), client_uuid: crypto.randomUUID(),
    }));
    await Sale.bulkCreate(rows); // local test database only
    const res = (await sales(`?period=all&nursery_id=${nurseryA}`)).body;
    expect(res.rows).toHaveLength(500);
    expect(res.row_limit).toBe(500);
    expect(res.totals).toEqual({ amount: 6000 + 50500, sales: 2 + 505, plants: 14 + 505 });
  });
});

describe('CSV export', () => {
  test('downloads every matching sale, makes formulas harmless and writes an audit row', async () => {
    await opB.post('/api/operator/sales').send({ batch_id: batchB.id, quantity: 1, unit_price: 900, customer_note: '=HYPERLINK("http://x")' });
    const res = await admin.get(`/api/admin/sales/export?period=all&nursery_id=${nurseryB}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="sales-');
    const lines = res.text.replace(/^﻿/, '').trim().split('\r\n');
    expect(lines[0]).toBe('sale_id,date_kigali,nursery,district,species,quantity,unit_price_rwf,total_rwf,payment_note');
    expect(lines).toHaveLength(1 + 2); // the synced sale and this one; the removed sale is not exported
    expect(res.text).toContain(`"'=HYPERLINK(""http://x"")"`);

    const log = await AuditLog.findOne({ where: { action: 'sales.exported' }, order: [['id', 'DESC']] });
    expect(log.entity_type).toBe('sale');
    expect(log.reason).toContain(`nursery #${nurseryB}`);
    expect(log.reason).toContain('2 rows');
    expect(log.actor_id).toBeTruthy();
  });

  test('the export has every row, also beyond the 500 shown on the page', async () => {
    const res = await admin.get(`/api/admin/sales/export?period=all&nursery_id=${nurseryA}`);
    expect(res.text.replace(/^﻿/, '').trim().split('\r\n')).toHaveLength(1 + 507);
  });
});

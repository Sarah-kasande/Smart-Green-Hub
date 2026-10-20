// Phase 2 (batches, sales, expenses, profit, offline sync) and Phase 3 (alerts, planting) API tests.
const crypto = require('crypto');
const h = require('../helpers');
const { Batch, Sale, RiskAlert, Notification, AuditLog } = require('../../src/models');
const { todayKigali, addDays } = require('../../src/utils/dates');
const { dispatchPending } = require('../../src/services/notificationService');

let admin;
let op;
let species;

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  species = await h.demoSpecies();
  op = (await h.approvedUser(admin, h.operatorData(h.uniqueEmail('op')))).client;
});
afterAll(() => h.sequelize.close());

const newBatch = (overrides = {}) =>
  op.post('/api/operator/batches').send({ species_id: species[0].id, quantity: 100, planting_date: '2026-01-01', unit_price: 500, ...overrides });

describe('approval gate (FR02)', () => {
  test('an operator whose nursery is not approved cannot record batches', async () => {
    const pending = await h.registerVerifiedUser(h.operatorData(h.uniqueEmail('pending-op')));
    const res = await pending.post('/api/operator/batches').send({ species_id: species[0].id, quantity: 5, planting_date: '2026-01-01', unit_price: 0 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NOT_APPROVED');
  });
});

describe('batches (FR04)', () => {
  test('dates come from species defaults: 180 days to ready, 60-day prime window (DEMO values)', async () => {
    const res = await newBatch();
    expect(res.status).toBe(201);
    expect(res.body.batch).toMatchObject({ quantity_initial: 100, quantity_current: 100, expected_ready_date: '2026-06-30', prime_end_date: '2026-08-29' });
  });

  test('the operator can adjust the defaults', async () => {
    const res = await newBatch({ days_to_ready: 30, prime_days: 10 });
    expect(res.body.batch).toMatchObject({ expected_ready_date: '2026-01-31', prime_end_date: '2026-02-10' });
  });

  test('the same client_uuid twice creates one batch (idempotent)', async () => {
    const uuid = crypto.randomUUID();
    const first = await newBatch({ client_uuid: uuid });
    const second = await newBatch({ client_uuid: uuid });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
    expect(await Batch.count({ where: { client_uuid: uuid } })).toBe(1);
  });

  test('invalid input is refused with field codes', async () => {
    const res = await newBatch({ quantity: 0, planting_date: '20-10-2026' });
    expect(res.status).toBe(400);
    expect(res.body.details.fields).toMatchObject({ quantity: 'invalid_quantity', planting_date: 'invalid_date' });
  });

  test('stage changes are saved and audited', async () => {
    const { body } = await newBatch();
    const res = await op.patch(`/api/operator/batches/${body.batch.id}`).send({ stage: 'ready', unit_price: 800 });
    expect(res.body.batch).toMatchObject({ stage: 'ready', unit_price: 800 });
    expect(await AuditLog.count({ where: { action: 'batch.stage_changed', entity_id: body.batch.id } })).toBe(1);
  });

  test('another operator cannot see or change my batch', async () => {
    const { body } = await newBatch();
    const other = (await h.approvedUser(admin, h.operatorData(h.uniqueEmail('other-op')))).client;
    expect((await other.get(`/api/operator/batches/${body.batch.id}`)).status).toBe(404);
    expect((await other.patch(`/api/operator/batches/${body.batch.id}`).send({ stage: 'cleared' })).status).toBe(404);
  });
});

describe('stock adjustments (FR04)', () => {
  test('a loss with a reason reduces stock and is kept in the history', async () => {
    const { body } = await newBatch();
    const res = await op.post(`/api/operator/batches/${body.batch.id}/adjustments`).send({ quantity_change: -20, reason: 'Lost to disease' });
    expect(res.status).toBe(201);
    const detail = await op.get(`/api/operator/batches/${body.batch.id}`);
    expect(detail.body.batch.quantity_current).toBe(80);
    expect(detail.body.adjustments[0]).toMatchObject({ quantity_change: -20, reason: 'Lost to disease' });
  });

  test('stock can never go below zero; a reason is required', async () => {
    const { body } = await newBatch({ quantity: 5 });
    expect((await op.post(`/api/operator/batches/${body.batch.id}/adjustments`).send({ quantity_change: -6, reason: 'x' })).body.code).toBe('STOCK_TOO_LOW');
    expect((await op.post(`/api/operator/batches/${body.batch.id}/adjustments`).send({ quantity_change: -1 })).status).toBe(400);
  });
});

describe('sales and expenses (FR05)', () => {
  let batch;
  beforeAll(async () => {
    batch = (await newBatch({ quantity: 50, unit_price: 1000 })).body.batch;
  });

  test('a sale reduces the batch stock', async () => {
    const res = await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 10 });
    expect(res.status).toBe(201);
    expect(res.body.sale.unit_price).toBe(1000); // batch price by default
    expect((await Batch.findByPk(batch.id)).quantity_current).toBe(40);
  });

  test('a sale larger than the available stock is refused', async () => {
    const res = await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 41 });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'SALE_EXCEEDS_STOCK', details: { available: 40 } });
  });

  test('the same sale uploaded twice is recorded once', async () => {
    const uuid = crypto.randomUUID();
    await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 5, client_uuid: uuid });
    const again = await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 5, client_uuid: uuid });
    expect(again.body.duplicate).toBe(true);
    expect((await Batch.findByPk(batch.id)).quantity_current).toBe(35);
  });

  test('archiving a mistaken sale puts the plants back', async () => {
    const sale = (await op.post('/api/operator/sales').send({ batch_id: batch.id, quantity: 5 })).body.sale;
    expect((await Batch.findByPk(batch.id)).quantity_current).toBe(30);
    await op.agent.delete(`/api/operator/sales/${sale.id}`).set('X-CSRF-Token', op.csrf).send({ reason: 'typed twice' });
    expect((await Batch.findByPk(batch.id)).quantity_current).toBe(35);
    expect(await Sale.count({ where: { id: sale.id } })).toBe(0); // archived, hidden
    expect(await Sale.count({ where: { id: sale.id }, paranoid: false })).toBe(1); // but never deleted (FR16)
  });

  test('expenses use a fixed list of categories', async () => {
    expect((await op.post('/api/operator/expenses').send({ category: 'water', amount: 3000 })).status).toBe(201);
    expect((await op.post('/api/operator/expenses').send({ category: 'lunch', amount: 3000 })).status).toBe(400);
  });

  test('profit or loss = income - expenses, split by species, batch and month', async () => {
    const res = await op.get('/api/operator/finance');
    // Sales so far: 10 + 5 at 1000 RWF = 15,000; expenses 3,000
    expect(res.body).toMatchObject({ income: 15000, expenses: 3000, profit: 12000, units_sold: 15 });
    expect(res.body.by_species[0]).toMatchObject({ units: 15, income: 15000 });
    expect(res.body.by_batch[0]).toMatchObject({ batch_id: batch.id, income: 15000 });
    expect(res.body.monthly).toHaveLength(1);
  });
});

describe('offline sync (FR13, NFR06)', () => {
  test('applies new changes, skips repeats and flags conflicts without stopping', async () => {
    const batchUuid = crypto.randomUUID();
    const saleUuid = crypto.randomUUID();
    const tooBig = crypto.randomUUID();
    const expenseUuid = crypto.randomUUID();
    const changes = [
      { client_uuid: batchUuid, type: 'batch', data: { species_id: species[1].id, quantity: 30, planting_date: '2026-03-01', unit_price: 200 } },
      // a sale of the batch created offline, found by its client_uuid
      { client_uuid: saleUuid, type: 'sale', data: { batch_client_uuid: batchUuid, quantity: 10 } },
      { client_uuid: tooBig, type: 'sale', data: { batch_client_uuid: batchUuid, quantity: 999 } },
      { client_uuid: expenseUuid, type: 'expense', data: { category: 'labour', amount: 2000 } },
    ];
    const first = await op.post('/api/operator/sync').send({ changes });
    expect(first.status).toBe(200);
    expect(first.body.applied).toEqual([batchUuid, saleUuid, expenseUuid]);
    expect(first.body.conflicts).toEqual([expect.objectContaining({ client_uuid: tooBig, code: 'SALE_EXCEEDS_STOCK' })]);
    expect(first.body.server_changes.batches.some((b) => b.client_uuid === batchUuid && b.quantity_current === 20)).toBe(true);

    // The phone did not get the answer and sends everything again: nothing is doubled
    const second = await op.post('/api/operator/sync').send({ changes: changes.slice(0, 2) });
    expect(second.body.skipped).toEqual([batchUuid, saleUuid]);
    expect(second.body.applied).toEqual([]);
    expect((await Batch.findOne({ where: { client_uuid: batchUuid } })).quantity_current).toBe(20);
  });

  test('each offline change is validated like an online one', async () => {
    const bad = [
      { client_uuid: crypto.randomUUID(), type: 'batch', data: { species_id: species[0].id, quantity: -5, planting_date: '2026-01-01' } },
      { client_uuid: crypto.randomUUID(), type: 'expense', data: { category: 'lunch', amount: 100 } },
      { client_uuid: crypto.randomUUID(), type: 'stock_adjustment', data: { batch_id: 1, quantity_change: 0, reason: 'x' } },
      { client_uuid: crypto.randomUUID(), type: 'sale', data: { quantity: 1 } },
    ];
    const res = await op.post('/api/operator/sync').send({ changes: bad });
    expect(res.body.applied).toEqual([]);
    expect(res.body.conflicts.map((c) => c.code)).toEqual(['VALIDATION_FAILED', 'VALIDATION_FAILED', 'VALIDATION_FAILED', 'VALIDATION_FAILED']);
  });

  test('a malformed change is refused', async () => {
    const res = await op.post('/api/operator/sync').send({ changes: [{ client_uuid: 'not-a-uuid', type: 'sale', data: {} }] });
    expect(res.status).toBe(400);
  });
});

describe('risk alerts (FR06, FR07)', () => {
  let batch;

  test('an unsold batch whose prime window ended creates one High alert and a notification', async () => {
    batch = (await newBatch({ quantity: 40, planting_date: addDays(todayKigali(), -300), days_to_ready: 100, prime_days: 30 })).body.batch;
    const res = await op.post('/api/operator/alerts/evaluate');
    expect(res.status).toBe(200);
    const alerts = await RiskAlert.findAll({ where: { batch_id: batch.id } });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ risk_level: 'high', status: 'open', days_to_prime_end: 0, projected_unsold: 40, suggested_action: 'surplus_board_or_donate' });
    expect(await Notification.count({ where: { event_key: `alert:${alerts[0].id}` } })).toBe(1);
    // The batch itself was not changed by the system (FR07)
    expect((await Batch.findByPk(batch.id)).stage).toBe(batch.stage);
  });

  test('running again keeps a single open alert per batch', async () => {
    await op.post('/api/operator/alerts/evaluate');
    expect(await RiskAlert.count({ where: { batch_id: batch.id } })).toBe(1);
  });

  test('acknowledge -> resolve; invalid changes are refused', async () => {
    const alert = await RiskAlert.findOne({ where: { batch_id: batch.id } });
    expect((await op.patch(`/api/operator/alerts/${alert.id}`).send({ status: 'acknowledged' })).status).toBe(200);
    expect((await op.patch(`/api/operator/alerts/${alert.id}`).send({ status: 'resolved', note: 'Posted to board' })).status).toBe(200);
    const again = await op.patch(`/api/operator/alerts/${alert.id}`).send({ status: 'acknowledged' });
    expect(again.body.code).toBe('INVALID_STATUS_CHANGE');
    expect(await AuditLog.count({ where: { entity_type: 'risk_alert', entity_id: alert.id } })).toBe(3); // created, acknowledged, resolved
  });

  test('after dismissing, the batch is not alerted again at the same level for a week', async () => {
    await op.post('/api/operator/alerts/evaluate'); // resolved -> a new alert is allowed
    const open = await RiskAlert.findOne({ where: { batch_id: batch.id, status: 'open' } });
    expect(open).not.toBeNull();
    await op.patch(`/api/operator/alerts/${open.id}`).send({ status: 'dismissed' });
    const res = await op.post('/api/operator/alerts/evaluate');
    expect(res.body.summary.quiet).toBeGreaterThanOrEqual(1);
    expect(await RiskAlert.count({ where: { batch_id: batch.id, status: 'open' } })).toBe(0);
  });

  test('alert emails go through the outbox (no Brevo key in tests: honestly "skipped")', async () => {
    const result = await dispatchPending();
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(result.sent).toBe(0);
    expect(h.sentEmails.some((m) => /surplus risk/.test(m.subject))).toBe(true);
  });
});

describe('planting recommendations (FR08)', () => {
  test('says "not enough history" instead of a number for a new species', async () => {
    const res = await op.get('/api/operator/planting');
    const rec = res.body.recommendations.find((x) => x.species_id === species[1].id);
    expect(rec).toMatchObject({ enough_history: false, quantity: null });
  });

  test('with 3+ months of sales it suggests a quantity and shows the basis', async () => {
    const own = await newBatch({ species_id: species[2].id, quantity: 500, planting_date: addDays(todayKigali(), -200), stage: 'ready' });
    // 90 plants sold over the last 3 months, the first sale 100 days ago
    const now = Date.now();
    for (const daysAgo of [100, 60, 30]) {
      await Sale.create({ batch_id: own.body.batch.id, nursery_id: own.body.batch.nursery_id, quantity: 30, unit_price: 100, sold_at: new Date(now - daysAgo * 86400000), client_uuid: crypto.randomUUID() });
    }
    // 60 sold within the last 90 days -> 20 a month; cycle 180 days = 6 months; x 1.1 = 132; pipeline = 500 -> 0
    const res = await op.get('/api/operator/planting');
    const rec = res.body.recommendations.find((x) => x.species_id === species[2].id);
    expect(rec.enough_history).toBe(true);
    expect(rec.basis).toMatchObject({ units_last_3_months: 60, average_monthly: 20, cycle_months: 6, pipeline: 500 });
    expect(rec.quantity).toBe(0);
    const saved = await op.post(`/api/operator/planting/${species[2].id}`).send({ status: 'accepted' });
    expect(saved.status).toBe(201);
  });
});

describe('dashboard', () => {
  test('shows stock, batches, alerts and this month', async () => {
    const res = await op.get('/api/operator/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.plants_in_stock).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('month.income');
  });
});

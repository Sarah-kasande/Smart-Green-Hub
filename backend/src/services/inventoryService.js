// InventoryService (Figure 7): plant batches and stock adjustments (FR04).
const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Batch, PlantSpecies, RuleSetting, StockAdjustment } = require('../models');
const HttpError = require('../utils/httpError');
const { todayKigali, addDays, daysBetween } = require('../utils/dates');
const audit = require('./auditService');
const { committedQuantity, availableQuantity } = require('./stockService');

const ACTIVE_STAGES = ['seedling', 'growing', 'ready', 'overgrown'];

// Prime-window length for a species: a species row in RULE_SETTINGS overrides the
// species default (docs/DEVIATIONS.md D8).
async function primeDaysFor(species, transaction) {
  const rule = await RuleSetting.findOne({ where: { species_id: species.id }, transaction });
  return rule?.prime_window_days ?? species.default_prime_days;
}

// The stage the dates suggest. The operator decides the real stage (FR07: the system never
// changes a batch by itself), so this is only shown as a hint and used when a batch is created.
//   before the ready date: "seedling" during the first third of the growing time, then "growing"
//   from the ready date to the prime-window end: "ready"
//   after the prime-window end: "overgrown"
function suggestStage({ planting_date, expected_ready_date, prime_end_date }, today = todayKigali()) {
  if (today > prime_end_date) return 'overgrown';
  if (today >= expected_ready_date) return 'ready';
  const growingDays = Math.max(1, daysBetween(planting_date, expected_ready_date));
  return daysBetween(planting_date, today) < growingDays / 3 ? 'seedling' : 'growing';
}

function toBatchJson(batch, extra = {}) {
  const json = batch.toJSON ? batch.toJSON() : batch;
  return { ...json, suggested_stage: json.stage === 'cleared' ? 'cleared' : suggestStage(json), ...extra };
}

async function findOwnBatch(nursery, batchId, { transaction, lock } = {}) {
  const batch = await Batch.findOne({
    where: { id: batchId, nursery_id: nursery.id },
    include: [{ model: PlantSpecies, as: 'species', paranoid: false }],
    transaction,
    lock: lock ? transaction.LOCK.UPDATE : undefined,
  });
  if (!batch) throw new HttpError(404, 'NOT_FOUND', 'Batch not found');
  return batch;
}

// Same client_uuid sent twice (e.g. an offline upload repeated) -> return the first record.
async function existingByUuid(Model, clientUuid, nursery, transaction) {
  if (!clientUuid) return null;
  const row = await Model.findOne({ where: { client_uuid: clientUuid }, paranoid: false, transaction });
  if (!row) return null;
  if (row.nursery_id !== nursery.id) throw new HttpError(409, 'DUPLICATE', 'This record already exists');
  return row;
}

async function createBatch(nursery, user, data) {
  return sequelize.transaction(async (transaction) => {
    const existing = await existingByUuid(Batch, data.client_uuid, nursery, transaction);
    if (existing) return { batch: existing, duplicate: true };

    const species = await PlantSpecies.findByPk(data.species_id, { transaction });
    if (!species) throw new HttpError(400, 'VALIDATION_FAILED', 'Unknown species', { fields: { species_id: 'invalid_choice' } });

    // Expected ready date and prime-window end come from species defaults the operator may adjust (FR04)
    const daysToReady = data.days_to_ready ?? species.default_days_to_ready;
    const primeDays = data.prime_days ?? (await primeDaysFor(species, transaction));
    const expectedReady = addDays(data.planting_date, daysToReady);
    const dates = {
      planting_date: data.planting_date,
      expected_ready_date: expectedReady,
      prime_end_date: addDays(expectedReady, primeDays),
    };

    const batch = await Batch.create(
      {
        nursery_id: nursery.id,
        species_id: species.id,
        quantity_initial: data.quantity,
        quantity_current: data.quantity,
        ...dates,
        stage: data.stage || suggestStage(dates),
        unit_price: data.unit_price ?? 0,
        client_uuid: data.client_uuid || crypto.randomUUID(),
      },
      { transaction }
    );
    await audit.log({ actorId: user.id, action: 'batch.created', entityType: 'batch', entityId: batch.id }, { transaction });
    return { batch, duplicate: false };
  });
}

async function listBatches(nursery, { stage, includeCleared = false } = {}) {
  const where = { nursery_id: nursery.id };
  if (stage) where.stage = stage;
  else if (!includeCleared) where.stage = { [Op.in]: ACTIVE_STAGES };
  const batches = await Batch.findAll({
    where,
    include: [{ model: PlantSpecies, as: 'species', paranoid: false }],
    order: [['prime_end_date', 'ASC']],
  });
  const result = [];
  for (const batch of batches) {
    result.push(toBatchJson(batch, { available: await availableQuantity(batch) }));
  }
  return result;
}

// Operator edits: stage, price and the two dates (the operator may adjust species defaults).
// Quantity is never edited directly; it changes through sales, stock adjustments or hand-overs.
async function updateBatch(nursery, user, batchId, data) {
  return sequelize.transaction(async (transaction) => {
    const batch = await findOwnBatch(nursery, batchId, { transaction, lock: true });
    const changes = {};
    for (const field of ['stage', 'unit_price', 'expected_ready_date', 'prime_end_date']) {
      if (data[field] !== undefined) changes[field] = data[field];
    }
    const ready = changes.expected_ready_date || batch.expected_ready_date;
    const primeEnd = changes.prime_end_date || batch.prime_end_date;
    if (primeEnd < ready) {
      throw new HttpError(400, 'VALIDATION_FAILED', 'Prime-window end is before the ready date', { fields: { prime_end_date: 'before_ready' } });
    }
    const stageChanged = changes.stage && changes.stage !== batch.stage;
    await batch.update(changes, { transaction });
    await audit.log(
      {
        actorId: user.id,
        action: stageChanged ? 'batch.stage_changed' : 'batch.updated',
        entityType: 'batch',
        entityId: batch.id,
        reason: stageChanged ? `stage -> ${changes.stage}` : null,
      },
      { transaction }
    );
    return batch;
  });
}

// Adds or removes plants with a reason (FR04), e.g. -20 "lost to disease".
// Stock may not drop below zero, nor below what is promised on the Surplus Board.
async function adjustStock(nursery, user, data) {
  return sequelize.transaction(async (transaction) => {
    const existing = await existingByUuid(StockAdjustment, data.client_uuid, nursery, transaction);
    if (existing) return { adjustment: existing, duplicate: true };

    const batch = await findOwnBatch(nursery, data.batch_id, { transaction, lock: true });
    const newQuantity = batch.quantity_current + data.quantity_change;
    const committed = await committedQuantity(batch.id, { transaction });
    if (newQuantity < committed) {
      throw new HttpError(409, 'STOCK_TOO_LOW', 'Not enough plants in this batch for this change', {
        available: batch.quantity_current - committed,
      });
    }
    await batch.update({ quantity_current: newQuantity }, { transaction });
    const adjustment = await StockAdjustment.create(
      {
        batch_id: batch.id,
        nursery_id: nursery.id,
        quantity_change: data.quantity_change,
        reason: data.reason,
        adjusted_by: user.id,
        adjusted_at: data.adjusted_at || new Date(),
        client_uuid: data.client_uuid || crypto.randomUUID(),
      },
      { transaction }
    );
    await audit.log(
      { actorId: user.id, action: 'stock.adjusted', entityType: 'batch', entityId: batch.id, reason: `${data.quantity_change}: ${data.reason}` },
      { transaction }
    );
    return { adjustment, duplicate: false };
  });
}

async function batchHistory(nursery, batchId) {
  const batch = await findOwnBatch(nursery, batchId);
  const adjustments = await StockAdjustment.findAll({ where: { batch_id: batch.id }, order: [['adjusted_at', 'DESC']] });
  return { batch: toBatchJson(batch, { available: await availableQuantity(batch) }), adjustments };
}

// Archive (FR16: never permanently deleted). Only possible while nothing is promised on the board.
async function archiveBatch(nursery, user, batchId, reason) {
  return sequelize.transaction(async (transaction) => {
    const batch = await findOwnBatch(nursery, batchId, { transaction, lock: true });
    if ((await committedQuantity(batch.id, { transaction })) > 0) {
      throw new HttpError(409, 'BATCH_HAS_LISTINGS', 'Withdraw the Surplus Board listings of this batch first');
    }
    await batch.destroy({ transaction });
    await audit.log({ actorId: user.id, action: 'batch.archived', entityType: 'batch', entityId: batch.id, reason }, { transaction });
  });
}

module.exports = {
  ACTIVE_STAGES,
  suggestStage,
  primeDaysFor,
  findOwnBatch,
  existingByUuid,
  toBatchJson,
  createBatch,
  listBatches,
  updateBatch,
  adjustStock,
  batchHistory,
  archiveBatch,
};

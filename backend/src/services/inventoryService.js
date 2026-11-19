// InventoryService (Figure 7): plant batches and stock adjustments (FR04).
// Batch dates always come from the administrator's species rules (services/batchDates.js);
// nurseries cannot change growing times or prime windows (docs/DEVIATIONS.md W39).
const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Batch, PlantSpecies, StockAdjustment } = require('../models');
const HttpError = require('../utils/httpError');
const audit = require('./auditService');
const { committedQuantity, availableQuantity } = require('./stockService');
const { primeDaysFor, datesFor, suggestStage, stageAfterDates } = require('./batchDates');
const speciesService = require('./speciesService');
const { dispatchSoon } = require('./notificationService');
const { lockOf } = require('../utils/sqlDialect');

const ACTIVE_STAGES = ['seedling', 'growing', 'ready', 'overgrown'];

// species_status: "approved", or "pending" (the batch waits for species approval: no dates, no
// alerts, no Surplus Board) or "rejected" (the nursery must choose another species).
function toBatchJson(batch, extra = {}) {
  const json = batch.toJSON ? batch.toJSON() : batch;
  return {
    ...json,
    suggested_stage: json.stage === 'cleared' ? 'cleared' : suggestStage(json),
    species_status: json.species?.status || null,
    ...extra,
  };
}

async function findOwnBatch(nursery, batchId, { transaction, lock } = {}) {
  const batch = await Batch.findOne({
    where: { id: batchId, nursery_id: nursery.id },
    include: [{ model: PlantSpecies, as: 'species', paranoid: false }],
    transaction,
    lock: lock ? lockOf(transaction, Batch) : undefined,
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

// Which species a new batch uses:
//   species_id   an approved species, or a waiting one (the nursery's own, or one shown to it as
//                "Did you mean ...?"). A species merged meanwhile (e.g. chosen offline) leads to
//                the approved species it was merged into.
//   new_species  "My species is not listed": { common_name, category, kinyarwanda_name, confirmed }
async function speciesForNewBatch(nursery, user, data, transaction) {
  if (data.new_species) return speciesService.speciesForProposal(nursery, user, data.new_species, transaction);
  let species = await PlantSpecies.findByPk(data.species_id, { transaction, paranoid: false });
  if (species?.status === 'merged') species = await PlantSpecies.findByPk(species.merged_into_id, { transaction });
  if (species?.status === 'rejected') {
    throw new HttpError(409, 'SPECIES_REJECTED', 'This species was rejected', { fields: { species_id: 'invalid_choice' } });
  }
  if (!species || species.archived_at || !['approved', 'pending'].includes(species.status)) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Unknown species', { fields: { species_id: 'invalid_choice' } });
  }
  return { species, created: false };
}

async function createBatch(nursery, user, data) {
  const result = await sequelize.transaction(async (transaction) => {
    const existing = await existingByUuid(Batch, data.client_uuid, nursery, transaction);
    if (existing) return { batch: existing, duplicate: true };

    // The species request (if any) and the batch are saved together: both or neither
    const { species, created } = await speciesForNewBatch(nursery, user, data, transaction);
    // Approved species: dates from the administrator's rules. Waiting species: no dates yet.
    const dates = await datesFor(species, data.planting_date, transaction);

    const batch = await Batch.create(
      {
        nursery_id: nursery.id,
        species_id: species.id,
        quantity_initial: data.quantity,
        quantity_current: data.quantity,
        ...dates,
        stage: data.stage || suggestStage(dates) || 'seedling',
        unit_price: data.unit_price ?? 0,
        // "Show to institutions" is ON unless the nursery switched it off (W43)
        show_to_institutions: data.show_to_institutions !== false,
        client_uuid: data.client_uuid || crypto.randomUUID(),
      },
      { transaction }
    );
    await audit.log({ actorId: user.id, action: 'batch.created', entityType: 'batch', entityId: batch.id }, { transaction });
    batch.setDataValue('species', species);
    return { batch, duplicate: false, speciesRequested: created };
  });
  if (result.speciesRequested) dispatchSoon(); // email the administrator
  return result;
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

// Operator edits: stage, price and "Show to institutions" (W43). The dates follow the administrator's species rules
// (docs/DEVIATIONS.md W39), so they cannot be edited here.
// Quantity is never edited directly; it changes through sales, stock adjustments or hand-overs.
async function updateBatch(nursery, user, batchId, data) {
  return sequelize.transaction(async (transaction) => {
    const batch = await findOwnBatch(nursery, batchId, { transaction, lock: true });
    const changes = {};
    for (const field of ['stage', 'unit_price', 'show_to_institutions']) {
      if (data[field] !== undefined) changes[field] = data[field];
    }
    const stageChanged = changes.stage && changes.stage !== batch.stage;
    const visibilityChanged = changes.show_to_institutions !== undefined && changes.show_to_institutions !== batch.show_to_institutions;
    await batch.update(changes, { transaction });
    await audit.log(
      {
        actorId: user.id,
        action: stageChanged ? 'batch.stage_changed' : 'batch.updated',
        entityType: 'batch',
        entityId: batch.id,
        reason:
          [stageChanged && `stage -> ${changes.stage}`, visibilityChanged && (changes.show_to_institutions ? 'shown to institutions' : 'hidden from institutions')]
            .filter(Boolean)
            .join('; ') || null,
      },
      { transaction }
    );
    return batch;
  });
}

// The species of a batch was rejected (or is still waiting): the nursery chooses another one.
// Stock, sales and history stay; with an approved species the batch gets its dates at once.
async function changeSpecies(nursery, user, batchId, speciesId) {
  return sequelize.transaction(async (transaction) => {
    const batch = await findOwnBatch(nursery, batchId, { transaction, lock: true });
    if (batch.species?.status === 'approved') {
      throw new HttpError(409, 'SPECIES_LOCKED', 'The species of this batch is already approved');
    }
    const species = await PlantSpecies.findByPk(speciesId, { transaction });
    const allowed = species && (species.status === 'approved' || (species.status === 'pending' && species.requested_by_nursery_id === nursery.id));
    if (!allowed || species.id === batch.species_id) {
      throw new HttpError(400, 'VALIDATION_FAILED', 'Choose another species', { fields: { species_id: 'invalid_choice' } });
    }
    const dates = await datesFor(species, batch.planting_date, transaction);
    const before = batch.species_id;
    await batch.update({ species_id: species.id, ...dates, stage: stageAfterDates(batch.stage, dates) }, { transaction });
    await audit.log(
      { actorId: user.id, action: 'batch.species_changed', entityType: 'batch', entityId: batch.id, reason: `species #${before} -> #${species.id}` },
      { transaction }
    );
    batch.setDataValue('species', species);
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
  changeSpecies,
  adjustStock,
  batchHistory,
  archiveBatch,
};

// SpeciesService: plant species proposed by nurseries and approved by the administrator
// (docs/DEVIATIONS.md W39).
//
// The flow:
//  1. A nursery adds a batch with "My species is not listed": name, plant type and an optional local
//     name. NO rules: growing time and prime window are always set by the administrator.
//     The species is saved with status "pending" together with the batch (one transaction).
//  2. While pending, the batch counts in stock but has no ready / prime-end dates, so it is left
//     out of the risk engine, alerts, planting suggestions and the Surplus Board.
//  3. The administrator decides:
//       approve -> enters or confirms the rules; every batch of the species gets its dates
//       reject  -> a reason is required; the batches keep their stock and wait for the nursery
//                  to choose another species
//       merge   -> a spelling duplicate of an approved species: the batches move to that species
//     Every decision is written to the audit log and the nurseries are notified.
//
// Duplicates: names are compared ignoring case, spaces, punctuation and accents
// (utils/speciesNames.js). The same name is never requested twice.
const { Op } = require('sequelize');
const { sequelize, Batch, Nursery, PlantSpecies, PlantingRecommendation, RuleSetting, User } = require('../models');
const HttpError = require('../utils/httpError');
const { isTest } = require('../config/env');
const { compareSpecies, normalizeName } = require('../utils/speciesNames');
const audit = require('./auditService');
const { notify, dispatchSoon } = require('./notificationService');
const { datesFor, stageAfterDates } = require('./batchDates');

// ---- Lists ----

// What a nursery may choose for a batch: approved species for everyone, plus the species this
// nursery proposed that are still waiting (marked "waiting for approval" on the screen).
async function listForNursery(nursery) {
  return PlantSpecies.findAll({
    where: { [Op.or]: [{ status: 'approved' }, { status: 'pending', requested_by_nursery_id: nursery.id }] },
    order: [['common_name', 'ASC']],
  });
}

// GET /api/species: operators see their own waiting species too; everyone else only approved ones
async function listForUser(user) {
  if (user.role === 'operator') {
    const nursery = await Nursery.findOne({ where: { owner_id: user.id } });
    if (nursery) return listForNursery(nursery);
  }
  return PlantSpecies.findAll({ where: { status: 'approved' }, order: [['common_name', 'ASC']] });
}

const shortJson = (s, nursery) => ({
  id: s.id,
  common_name: s.common_name,
  kinyarwanda_name: s.kinyarwanda_name,
  category: s.category,
  status: s.status,
  own: Boolean(nursery && s.requested_by_nursery_id === nursery.id),
});

// Species (approved or waiting) whose name matches the typed one.
//   { exact, similar } - exact: the same name once normalized (or null); similar: close names
// A name that was merged into another species leads to that approved species.
async function findMatches(name, { nursery, transaction } = {}) {
  const candidates = await PlantSpecies.findAll({
    where: { status: { [Op.in]: ['approved', 'pending'] } },
    order: [['common_name', 'ASC']],
    transaction,
  });
  // Archived (merged) duplicates still know their real species
  const merged = await PlantSpecies.findAll({ where: { status: 'merged' }, paranoid: false, transaction });

  let exact = null;
  const similar = [];
  for (const species of candidates) {
    const match = compareSpecies(species, name);
    if (match === 'exact' && !exact) exact = species;
    else if (match) similar.push(species);
  }
  if (!exact) {
    const duplicate = merged.find((m) => compareSpecies(m, name) === 'exact');
    if (duplicate) exact = candidates.find((c) => c.id === duplicate.merged_into_id && c.status === 'approved') || null;
  }
  return {
    exact: exact ? shortJson(exact, nursery) : null,
    similar: similar.slice(0, 5).map((s) => shortJson(s, nursery)),
    exactRow: exact,
  };
}

// ---- 1. A nursery proposes a species (called inside the batch transaction) ----

// Returns { species, created }. Reuses an existing species with the same name instead of creating
// a second one. Similar (not identical) names are refused with SIMILAR_SPECIES so the nursery can
// answer "Did you mean ...?", unless it already said "no, it is a new species" (confirmed: true).
async function speciesForProposal(nursery, user, proposal, transaction) {
  const name = String(proposal.common_name || '').trim().replace(/\s+/g, ' ');
  if (normalizeName(name).length < 2) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Species name is required', { fields: { 'new_species.common_name': 'required' } });
  }
  const { exact, exactRow, similar } = await findMatches(name, { nursery, transaction });
  if (exactRow) return { species: exactRow, created: false };
  if (similar.length && !proposal.confirmed) {
    throw new HttpError(409, 'SIMILAR_SPECIES', 'A similar species already exists', { similar, exact });
  }

  const species = await PlantSpecies.create(
    {
      common_name: name,
      kinyarwanda_name: String(proposal.kinyarwanda_name || '').trim() || null,
      category: proposal.category,
      status: 'pending',
      requested_by_nursery_id: nursery.id,
      // No rules: the administrator sets them when approving
      default_days_to_ready: null,
      default_prime_days: null,
    },
    { transaction }
  );
  await audit.log({ actorId: user.id, action: 'species.requested', entityType: 'plant_species', entityId: species.id, reason: name }, { transaction });

  // Every active administrator: in-app notification + email (through the outbox)
  const admins = await User.findAll({ where: { role: 'admin', status: 'active' }, transaction });
  for (const admin of admins) {
    await notify(
      {
        userId: admin.id,
        type: 'species_requested',
        eventKey: `species:${species.id}:requested:admin:${admin.id}`,
        payload: { species_id: species.id, species: name, category: species.category, nursery: nursery.name },
      },
      { transaction }
    );
  }
  return { species, created: true };
}

// ---- 2. The administrator's queue ----

async function pendingCount() {
  return PlantSpecies.count({ where: { status: 'pending' } });
}

// Requests = species proposed by a nursery. status: pending (default), approved, rejected, merged, all
async function listRequests({ status = 'pending' } = {}) {
  const where = { requested_by_nursery_id: { [Op.ne]: null } };
  if (status !== 'all') where.status = status;
  const rows = await PlantSpecies.findAll({
    where,
    paranoid: false, // merged requests are archived but stay visible in the history
    include: [
      { model: Nursery, as: 'requestedBy', attributes: ['id', 'name', 'district', 'sector'], paranoid: false },
      { model: User, as: 'decidedBy', attributes: ['id', 'full_name'], paranoid: false },
      { model: PlantSpecies, as: 'mergedInto', attributes: ['id', 'common_name'], paranoid: false },
    ],
    order: [['created_at', status === 'pending' ? 'ASC' : 'DESC']],
    limit: 300,
  });
  const approved = await PlantSpecies.findAll({ where: { status: 'approved' }, order: [['common_name', 'ASC']] });

  const result = [];
  for (const row of rows) {
    const batches = await Batch.count({ where: { species_id: row.id } });
    const plants = (await Batch.sum('quantity_current', { where: { species_id: row.id } })) || 0;
    // Approved species with a close name, offered first for "Merge"
    const suggestions = row.status === 'pending' ? approved.filter((a) => compareSpecies(a, row.common_name) || (row.kinyarwanda_name && compareSpecies(a, row.kinyarwanda_name))) : [];
    result.push({
      ...row.toJSON(),
      batch_count: batches,
      plant_count: plants,
      merge_suggestions: suggestions.slice(0, 5).map((s) => ({ id: s.id, common_name: s.common_name })),
    });
  }
  const counts = {};
  for (const s of ['pending', 'approved', 'rejected', 'merged']) {
    counts[s] = await PlantSpecies.count({ where: { requested_by_nursery_id: { [Op.ne]: null }, status: s }, paranoid: false });
  }
  return { items: result, counts };
}

// ---- 3. Decisions ----

async function lockPendingRequest(id, transaction) {
  const species = await PlantSpecies.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!species || !species.requested_by_nursery_id) throw new HttpError(404, 'NOT_FOUND', 'Species request not found');
  if (species.status !== 'pending') throw new HttpError(409, 'ALREADY_DECIDED', 'This species request was already decided');
  return species;
}

// Nurseries to tell about a decision: the one that proposed it and any other with batches of it
async function nurseriesUsing(species, transaction) {
  const batches = await Batch.findAll({ where: { species_id: species.id }, attributes: ['nursery_id'], paranoid: false, transaction });
  const ids = new Set([species.requested_by_nursery_id, ...batches.map((b) => b.nursery_id)].filter(Boolean));
  return Nursery.findAll({ where: { id: { [Op.in]: [...ids] } }, paranoid: false, transaction });
}

async function notifyNurseries(nurseries, type, species, payload, transaction) {
  for (const nursery of nurseries) {
    await notify(
      { userId: nursery.owner_id, type, eventKey: `species:${species.id}:${type}:nursery:${nursery.id}`, payload: { species_id: species.id, ...payload } },
      { transaction }
    );
  }
}

// Gives every batch of `fromSpeciesId` the species `species` and dates from its rules.
// Returns the ids of the nurseries whose batches changed.
async function moveBatches(fromSpeciesId, species, transaction) {
  const batches = await Batch.findAll({ where: { species_id: fromSpeciesId }, transaction, lock: transaction.LOCK.UPDATE });
  const nurseryIds = new Set();
  for (const batch of batches) {
    const dates = await datesFor(species, batch.planting_date, transaction);
    await batch.update({ species_id: species.id, ...dates, stage: stageAfterDates(batch.stage, dates) }, { transaction });
    nurseryIds.add(batch.nursery_id);
  }
  return { count: batches.length, nurseryIds: [...nurseryIds] };
}

// Refuses a name that another species already has (compared ignoring case, spaces and accents).
//   exceptId = the species being approved or edited (it may keep its own name). When approving a
//   request, only APPROVED species count: a same-name approved species means "merge", not "approve".
//   A brand-new species from the administrator may not repeat an approved or a waiting name.
async function refuseDuplicateName(name, exceptId, transaction) {
  const where = { status: { [Op.in]: exceptId ? ['approved'] : ['approved', 'pending'] } };
  if (exceptId) where.id = { [Op.ne]: exceptId };
  const others = await PlantSpecies.findAll({ where, transaction });
  const same = others.find((s) => compareSpecies(s, name) === 'exact');
  if (same) {
    throw new HttpError(409, 'SPECIES_EXISTS', 'A species with this name already exists', { species_id: same.id, species: same.common_name, fields: { common_name: 'duplicate' } });
  }
}

// After a decision that gave batches their dates: run the risk rules for those nurseries now,
// so a batch planted long ago gets its alert at once instead of after the nightly job.
// A failure here must not undo the decision, so it is only logged.
// (Not in tests: there the tests run the risk check themselves, like dispatchSoon.)
function evaluateSoon(nurseryIds) {
  if (!nurseryIds.length || isTest) return;
  const risk = require('./riskService'); // required here to keep the module load order simple
  Promise.all(nurseryIds.map((nurseryId) => risk.runEvaluation({ nurseryId }))).catch((e) => console.error('Risk check after species decision failed:', e.message));
}

async function approve(admin, id, data) {
  const result = await sequelize.transaction(async (transaction) => {
    const species = await lockPendingRequest(id, transaction);
    const name = data.common_name.trim().replace(/\s+/g, ' ');
    await refuseDuplicateName(name, species.id, transaction);
    const nurseries = await nurseriesUsing(species, transaction);
    await species.update(
      {
        common_name: name,
        kinyarwanda_name: data.kinyarwanda_name?.trim() || null,
        category: data.category,
        default_days_to_ready: data.default_days_to_ready,
        default_prime_days: data.default_prime_days,
        status: 'approved',
        decided_by: admin.id,
        decided_at: new Date(),
        decision_reason: null,
      },
      { transaction }
    );
    const moved = await moveBatches(species.id, species, transaction);
    await audit.log(
      { actorId: admin.id, action: 'species.approved', entityType: 'plant_species', entityId: species.id, reason: `${name}: ${data.default_days_to_ready} days to ready, ${data.default_prime_days} prime days, ${moved.count} batches` },
      { transaction }
    );
    await notifyNurseries(nurseries, 'species_approved', species, { species: name, batches: moved.count }, transaction);
    return { species, nurseryIds: moved.nurseryIds };
  });
  dispatchSoon();
  evaluateSoon(result.nurseryIds);
  return result.species;
}

async function reject(admin, id, reason) {
  const species = await sequelize.transaction(async (transaction) => {
    const row = await lockPendingRequest(id, transaction);
    const nurseries = await nurseriesUsing(row, transaction);
    await row.update({ status: 'rejected', decided_by: admin.id, decided_at: new Date(), decision_reason: reason }, { transaction });
    await audit.log({ actorId: admin.id, action: 'species.rejected', entityType: 'plant_species', entityId: row.id, reason }, { transaction });
    // The batches are not touched: stock is kept and the nursery chooses another species
    await notifyNurseries(nurseries, 'species_rejected', row, { species: row.common_name, reason }, transaction);
    return row;
  });
  dispatchSoon();
  return species;
}

async function merge(admin, id, targetId, reason) {
  const result = await sequelize.transaction(async (transaction) => {
    const species = await lockPendingRequest(id, transaction);
    const target = await PlantSpecies.findByPk(targetId, { transaction });
    if (!target || target.status !== 'approved' || target.id === species.id) {
      throw new HttpError(400, 'VALIDATION_FAILED', 'Choose an approved species', { fields: { target_id: 'invalid_choice' } });
    }
    const nurseries = await nurseriesUsing(species, transaction);
    const moved = await moveBatches(species.id, target, transaction);
    // Nothing else should point to a waiting species, but move it anyway so nothing is lost
    await PlantingRecommendation.update({ species_id: target.id }, { where: { species_id: species.id }, transaction });
    await RuleSetting.destroy({ where: { species_id: species.id }, transaction });
    await species.update({ status: 'merged', merged_into_id: target.id, decided_by: admin.id, decided_at: new Date(), decision_reason: reason || null }, { transaction });
    await species.destroy({ transaction }); // archived: it never appears in a list again
    await audit.log(
      { actorId: admin.id, action: 'species.merged', entityType: 'plant_species', entityId: species.id, reason: `into #${target.id} ${target.common_name}${reason ? `: ${reason}` : ''}`.slice(0, 500) },
      { transaction }
    );
    await notifyNurseries(nurseries, 'species_merged', species, { species: species.common_name, into: target.common_name, batches: moved.count }, transaction);
    return { target, nurseryIds: moved.nurseryIds };
  });
  dispatchSoon();
  evaluateSoon(result.nurseryIds);
  return result.target;
}

module.exports = {
  listForNursery,
  listForUser,
  findMatches,
  speciesForProposal,
  pendingCount,
  listRequests,
  approve,
  reject,
  merge,
  refuseDuplicateName,
};

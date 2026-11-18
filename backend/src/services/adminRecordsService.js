// AdminRecordsService: the administrator manages nurseries, institutions and batches
// (docs/DEVIATIONS.md W47) and publishes batches on the public homepage (W48).
//
// ARCHIVE is the soft delete (archived_at, Sequelize "paranoid", FR16). An archived record:
//   - nursery:     its account cannot sign in or post; it disappears from the directory, the Surplus
//                  Board, Available plants, the homepage and the risk job (all these queries leave out
//                  archived nurseries). Its sales, requests and impact stay for reports and for the
//                  other side's history.
//   - institution: its account cannot sign in or request; its request history stays.
//   - batch:       leaves stock, risk, alerts, listings and the homepage; its sales and requests stay.
// Everything still promised is released in the same transaction (surplusService.releaseForArchive):
// open requests are cancelled and open listings withdrawn, and the other side is notified.
// The person is told by email and in-app notification. Signing out happens at once (token_version + 1).
// UNARCHIVE restores the record. Cancelled requests and withdrawn listings stay closed: they were
// decisions the other side was already told about, and the plants may have been promised elsewhere.
//
// PERMANENT DELETE only when nothing is linked (no batches, sales, expenses, listings, requests,
// species requests, stock changes or alerts). Otherwise it is refused with HAS_HISTORY and the list of
// what is linked, so the administrator archives instead. The audit log is never deleted, and every
// account appears in it from the day it registered, so for a nursery or institution the ACCOUNT row is
// kept only as an anonymous placeholder (name, email and phone erased, signed out, archived): the
// personal details are gone while the audit log stays complete.
//
// A reason is required to archive and to delete; every action is written to the audit log.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Nursery,
  Institution,
  Batch,
  PlantSpecies,
  Sale,
  Expense,
  StockAdjustment,
  RiskAlert,
  SurplusListing,
  SurplusRequest,
  PlantingRecommendation,
  UploadedFile,
  AuthToken,
  Notification,
} = require('../models');
const HttpError = require('../utils/httpError');
const audit = require('./auditService');
const { notify, dispatchSoon } = require('./notificationService');
const { releaseForArchive } = require('./surplusService');
const { committedForBatches } = require('./stockService');
const { publishBlockReason } = require('./homepageService');
const inventory = require('./inventoryService');

const userAttributes = ['id', 'full_name', 'email', 'phone', 'preferred_language'];

// status: active (default) | archived | all  ->  Sequelize options
function statusOptions(status) {
  if (status === 'archived') return { paranoid: false, where: { archived_at: { [Op.ne]: null } } };
  if (status === 'all') return { paranoid: false, where: {} };
  return { paranoid: true, where: {} };
}

// Counts for the filter: { active, archived, all }
async function statusCounts(Model, where = {}) {
  const all = await Model.count({ where, paranoid: false });
  const active = await Model.count({ where });
  return { active, archived: all - active, all };
}

const like = (q) => `%${String(q).trim().replace(/[\\%_]/g, '\\$&')}%`;

async function tellOwner(userId, type, payload, logRow, transaction) {
  if (!userId) return;
  await notify({ userId, type, eventKey: `audit:${logRow.id}:user:${userId}`, payload }, { transaction });
}

// Signs the account out on every device (the session cookie carries token_version)
async function signOutEverywhere(userId, transaction) {
  await User.increment('token_version', { by: 1, where: { id: userId }, transaction });
}

// The account of a deleted organisation stays only as an anonymous placeholder (see the top of the file)
async function eraseAccount(userId, transaction) {
  await AuthToken.destroy({ where: { user_id: userId }, transaction });
  await Notification.destroy({ where: { user_id: userId }, transaction });
  await UploadedFile.destroy({ where: { owner_user_id: userId }, force: true, transaction });
  const user = await User.findByPk(userId, { paranoid: false, transaction });
  if (!user) return;
  await user.update(
    {
      full_name: 'Deleted account',
      email: `deleted-${user.id}@deleted.invalid`,
      phone: null,
      password_hash: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
      status: 'suspended',
      token_version: user.token_version + 1,
    },
    { transaction }
  );
  if (!user.archived_at) await user.destroy({ transaction });
}

function refuseIfLinked(links) {
  const linked = Object.fromEntries(Object.entries(links).filter(([, n]) => n > 0));
  if (Object.keys(linked).length) {
    throw new HttpError(409, 'HAS_HISTORY', 'This record has history and can only be archived', { links: linked });
  }
}

// ======================= Nurseries =======================

function nurseryJson(n, extra = {}) {
  return {
    id: n.id,
    name: n.name,
    district: n.district,
    sector: n.sector,
    address_text: n.address_text,
    verification_status: n.verification_status,
    is_listed: n.is_listed,
    show_available_plants: n.show_available_plants,
    show_on_homepage: n.show_on_homepage,
    archived_at: n.archived_at,
    created_at: n.created_at,
    owner: n.owner ? { id: n.owner.id, full_name: n.owner.full_name, email: n.owner.email, phone: n.owner.phone } : null,
    ...extra,
  };
}

async function findNursery(id, transaction, lock = false) {
  const nursery = await Nursery.findByPk(id, {
    paranoid: false,
    include: [{ model: User, as: 'owner', attributes: userAttributes, paranoid: false }],
    transaction,
    lock: lock ? transaction.LOCK.UPDATE : undefined,
  });
  if (!nursery) throw new HttpError(404, 'NOT_FOUND', 'Nursery not found');
  return nursery;
}

async function nurseryLinks(nurseryId) {
  const batchIds = (await Batch.findAll({ where: { nursery_id: nurseryId }, attributes: ['id'], paranoid: false })).map((b) => b.id);
  const listingIds = (await SurplusListing.findAll({ where: { nursery_id: nurseryId }, attributes: ['id'], paranoid: false })).map((l) => l.id);
  const requestWhere = [];
  if (listingIds.length) requestWhere.push({ listing_id: { [Op.in]: listingIds } });
  if (batchIds.length) requestWhere.push({ batch_id: { [Op.in]: batchIds } });
  return {
    batches: batchIds.length,
    sales: await Sale.count({ where: { nursery_id: nurseryId }, paranoid: false }),
    expenses: await Expense.count({ where: { nursery_id: nurseryId }, paranoid: false }),
    listings: listingIds.length,
    requests: requestWhere.length ? await SurplusRequest.count({ where: { [Op.or]: requestWhere } }) : 0,
    species_requests: await PlantSpecies.count({ where: { requested_by_nursery_id: nurseryId }, paranoid: false }),
    planting_suggestions: await PlantingRecommendation.count({ where: { nursery_id: nurseryId } }),
  };
}

async function listNurseries({ status = 'active', q, district } = {}) {
  const options = statusOptions(status);
  const where = { ...options.where };
  if (district) where.district = district;
  if (q && q.trim()) where[Op.or] = [{ name: { [Op.like]: like(q) } }, { sector: { [Op.like]: like(q) } }, { '$owner.full_name$': { [Op.like]: like(q) } }, { '$owner.email$': { [Op.like]: like(q) } }];
  const rows = await Nursery.findAll({
    where,
    paranoid: options.paranoid,
    include: [{ model: User, as: 'owner', attributes: userAttributes, paranoid: false }],
    order: [['name', 'ASC']],
    limit: 500,
  });
  const batchCounts = await Batch.findAll({
    where: { nursery_id: { [Op.in]: rows.map((r) => r.id) } },
    attributes: ['nursery_id', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
    group: ['nursery_id'],
    raw: true,
  });
  const batches = new Map(batchCounts.map((r) => [r.nursery_id, Number(r.n)]));
  return { items: rows.map((n) => nurseryJson(n, { batch_count: batches.get(n.id) || 0 })), counts: await statusCounts(Nursery) };
}

async function getNursery(id) {
  const nursery = await findNursery(id);
  return nurseryJson(nursery, { links: await nurseryLinks(nursery.id) });
}

// Safe fields only: names, contact details, district, sector, address
async function updateNursery(admin, id, data) {
  await sequelize.transaction(async (transaction) => {
    const nursery = await findNursery(id, transaction, true);
    const changed = [];
    const nurseryChanges = {};
    for (const field of ['name', 'district', 'sector', 'address_text']) {
      if (data[field] !== undefined && (data[field] || null) !== (nursery[field] || null)) {
        nurseryChanges[field] = data[field] || null;
        changed.push(field);
      }
    }
    const ownerChanges = {};
    if (data.owner_full_name !== undefined && data.owner_full_name !== nursery.owner?.full_name) ownerChanges.full_name = data.owner_full_name;
    if (data.owner_phone !== undefined && (data.owner_phone || null) !== (nursery.owner?.phone || null)) ownerChanges.phone = data.owner_phone || null;
    changed.push(...Object.keys(ownerChanges).map((f) => `owner ${f}`));
    if (!changed.length) return;
    await nursery.update(nurseryChanges, { transaction });
    if (Object.keys(ownerChanges).length) await User.update(ownerChanges, { where: { id: nursery.owner_id }, transaction });
    await audit.log(
      { actorId: admin.id, action: 'nursery.edited', entityType: 'nursery', entityId: nursery.id, reason: [`changed: ${changed.join(', ')}`, data.reason].filter(Boolean).join(' · ') },
      { transaction }
    );
  });
  return getNursery(id);
}

async function archiveNursery(admin, id, reason) {
  const result = await sequelize.transaction(async (transaction) => {
    const nursery = await findNursery(id, transaction, true);
    if (nursery.archived_at) throw new HttpError(409, 'ALREADY_ARCHIVED', 'This nursery is already archived');
    const released = await releaseForArchive({ nurseryId: nursery.id }, reason, admin, transaction);
    await nursery.destroy({ transaction });
    await signOutEverywhere(nursery.owner_id, transaction);
    const logRow = await audit.log(
      { actorId: admin.id, action: 'nursery.archived', entityType: 'nursery', entityId: nursery.id, reason: `${reason} · ${released.requestsCancelled} requests cancelled, ${released.listingsWithdrawn} listings withdrawn` },
      { transaction }
    );
    await tellOwner(nursery.owner_id, 'record_archived', { kind: 'nursery', name: nursery.name, reason }, logRow, transaction);
    return released;
  });
  dispatchSoon();
  return result;
}

async function unarchiveNursery(admin, id, reason) {
  await sequelize.transaction(async (transaction) => {
    const nursery = await findNursery(id, transaction, true);
    if (!nursery.archived_at) throw new HttpError(409, 'NOT_ARCHIVED', 'This nursery is not archived');
    await nursery.restore({ transaction });
    const logRow = await audit.log({ actorId: admin.id, action: 'nursery.unarchived', entityType: 'nursery', entityId: nursery.id, reason: reason || null }, { transaction });
    await tellOwner(nursery.owner_id, 'record_restored', { kind: 'nursery', name: nursery.name, reason: reason || null }, logRow, transaction);
  });
  dispatchSoon();
}

async function deleteNursery(admin, id, reason) {
  const nursery = await findNursery(id);
  refuseIfLinked(await nurseryLinks(nursery.id));
  await sequelize.transaction(async (transaction) => {
    const ownerId = nursery.owner_id;
    await nursery.destroy({ force: true, transaction });
    // The account goes too, unless it still owns another nursery
    if ((await Nursery.count({ where: { owner_id: ownerId }, paranoid: false, transaction })) === 0) await eraseAccount(ownerId, transaction);
    await audit.log({ actorId: admin.id, action: 'nursery.deleted', entityType: 'nursery', entityId: nursery.id, reason: `${reason} · was "${nursery.name}"` }, { transaction });
  });
}

// ======================= Institutions =======================

function institutionJson(i, extra = {}) {
  return {
    id: i.id,
    name: i.org_name,
    org_type: i.org_type,
    district: i.district,
    sector: i.sector,
    contact_phone: i.contact_phone,
    verification_status: i.verification_status,
    archived_at: i.archived_at,
    created_at: i.created_at,
    user: i.user ? { id: i.user.id, full_name: i.user.full_name, email: i.user.email, phone: i.user.phone } : null,
    ...extra,
  };
}

async function findInstitution(id, transaction, lock = false) {
  const institution = await Institution.findByPk(id, {
    paranoid: false,
    include: [{ model: User, as: 'user', attributes: userAttributes, paranoid: false }],
    transaction,
    lock: lock ? transaction.LOCK.UPDATE : undefined,
  });
  if (!institution) throw new HttpError(404, 'NOT_FOUND', 'Institution not found');
  return institution;
}

async function institutionLinks(institutionId) {
  return { requests: await SurplusRequest.count({ where: { institution_id: institutionId } }) };
}

async function listInstitutions({ status = 'active', q, district, orgType } = {}) {
  const options = statusOptions(status);
  const where = { ...options.where };
  if (district) where.district = district;
  if (orgType) where.org_type = orgType;
  if (q && q.trim()) where[Op.or] = [{ org_name: { [Op.like]: like(q) } }, { sector: { [Op.like]: like(q) } }, { '$user.full_name$': { [Op.like]: like(q) } }, { '$user.email$': { [Op.like]: like(q) } }];
  const rows = await Institution.findAll({
    where,
    paranoid: options.paranoid,
    include: [{ model: User, as: 'user', attributes: userAttributes, paranoid: false }],
    order: [['org_name', 'ASC']],
    limit: 500,
  });
  const requestCounts = await SurplusRequest.findAll({
    where: { institution_id: { [Op.in]: rows.map((r) => r.id) } },
    attributes: ['institution_id', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
    group: ['institution_id'],
    raw: true,
  });
  const requests = new Map(requestCounts.map((r) => [r.institution_id, Number(r.n)]));
  return { items: rows.map((i) => institutionJson(i, { request_count: requests.get(i.id) || 0 })), counts: await statusCounts(Institution) };
}

async function getInstitution(id) {
  const institution = await findInstitution(id);
  return institutionJson(institution, { links: await institutionLinks(institution.id) });
}

async function updateInstitution(admin, id, data) {
  await sequelize.transaction(async (transaction) => {
    const institution = await findInstitution(id, transaction, true);
    const changed = [];
    const changes = {};
    const map = { name: 'org_name', org_type: 'org_type', district: 'district', sector: 'sector', contact_phone: 'contact_phone' };
    for (const [input, column] of Object.entries(map)) {
      if (data[input] !== undefined && (data[input] || null) !== (institution[column] || null)) {
        changes[column] = data[input] || null;
        changed.push(input);
      }
    }
    const userChanges = {};
    if (data.user_full_name !== undefined && data.user_full_name !== institution.user?.full_name) userChanges.full_name = data.user_full_name;
    if (data.user_phone !== undefined && (data.user_phone || null) !== (institution.user?.phone || null)) userChanges.phone = data.user_phone || null;
    changed.push(...Object.keys(userChanges).map((f) => `contact person ${f}`));
    if (!changed.length) return;
    await institution.update(changes, { transaction });
    if (Object.keys(userChanges).length) await User.update(userChanges, { where: { id: institution.user_id }, transaction });
    await audit.log(
      { actorId: admin.id, action: 'institution.edited', entityType: 'institution', entityId: institution.id, reason: [`changed: ${changed.join(', ')}`, data.reason].filter(Boolean).join(' · ') },
      { transaction }
    );
  });
  return getInstitution(id);
}

async function archiveInstitution(admin, id, reason) {
  const result = await sequelize.transaction(async (transaction) => {
    const institution = await findInstitution(id, transaction, true);
    if (institution.archived_at) throw new HttpError(409, 'ALREADY_ARCHIVED', 'This institution is already archived');
    const released = await releaseForArchive({ institutionId: institution.id }, reason, admin, transaction);
    await institution.destroy({ transaction });
    await signOutEverywhere(institution.user_id, transaction);
    const logRow = await audit.log(
      { actorId: admin.id, action: 'institution.archived', entityType: 'institution', entityId: institution.id, reason: `${reason} · ${released.requestsCancelled} requests cancelled` },
      { transaction }
    );
    await tellOwner(institution.user_id, 'record_archived', { kind: 'institution', name: institution.org_name, reason }, logRow, transaction);
    return released;
  });
  dispatchSoon();
  return result;
}

async function unarchiveInstitution(admin, id, reason) {
  await sequelize.transaction(async (transaction) => {
    const institution = await findInstitution(id, transaction, true);
    if (!institution.archived_at) throw new HttpError(409, 'NOT_ARCHIVED', 'This institution is not archived');
    await institution.restore({ transaction });
    const logRow = await audit.log({ actorId: admin.id, action: 'institution.unarchived', entityType: 'institution', entityId: institution.id, reason: reason || null }, { transaction });
    await tellOwner(institution.user_id, 'record_restored', { kind: 'institution', name: institution.org_name, reason: reason || null }, logRow, transaction);
  });
  dispatchSoon();
}

async function deleteInstitution(admin, id, reason) {
  const institution = await findInstitution(id);
  refuseIfLinked(await institutionLinks(institution.id));
  await sequelize.transaction(async (transaction) => {
    await institution.destroy({ force: true, transaction });
    await eraseAccount(institution.user_id, transaction);
    await audit.log({ actorId: admin.id, action: 'institution.deleted', entityType: 'institution', entityId: institution.id, reason: `${reason} · was "${institution.org_name}"` }, { transaction });
  });
}

// ======================= Batches =======================

const batchIncludes = () => [
  { model: PlantSpecies, as: 'species', paranoid: false },
  { model: Nursery, as: 'nursery', paranoid: false, include: [{ model: User, as: 'owner', attributes: ['id', 'full_name'], paranoid: false }] },
];

function batchJson(b, free, extra = {}) {
  const block = publishBlockReason(b, free);
  return {
    id: b.id,
    stage: b.stage,
    planting_date: b.planting_date,
    expected_ready_date: b.expected_ready_date,
    prime_end_date: b.prime_end_date,
    quantity_initial: b.quantity_initial,
    quantity_current: b.quantity_current,
    free,
    unit_price: b.unit_price,
    show_to_institutions: b.show_to_institutions,
    archived_at: b.archived_at,
    species: b.species ? { id: b.species.id, name: b.species.common_name, category: b.species.category, status: b.species.status } : null,
    nursery: b.nursery
      ? { id: b.nursery.id, name: b.nursery.name, district: b.nursery.district, archived: Boolean(b.nursery.archived_at), show_on_homepage: b.nursery.show_on_homepage, verification_status: b.nursery.verification_status }
      : null,
    // Homepage: published by the administrator; shown only while nothing blocks it
    published_at: b.published_at,
    featured_rank: b.featured_rank,
    publish_block: block,
    on_homepage: Boolean(b.published_at) && !block,
    ...extra,
  };
}

async function findBatch(id, transaction, lock = false) {
  const batch = await Batch.findByPk(id, { paranoid: false, include: batchIncludes(), transaction, lock: lock ? transaction.LOCK.UPDATE : undefined });
  if (!batch) throw new HttpError(404, 'NOT_FOUND', 'Batch not found');
  return batch;
}

async function batchLinks(batchId) {
  return {
    sales: await Sale.count({ where: { batch_id: batchId }, paranoid: false }),
    requests: await SurplusRequest.count({ where: { batch_id: batchId } }),
    listings: await SurplusListing.count({ where: { batch_id: batchId }, paranoid: false }),
    stock_changes: await StockAdjustment.count({ where: { batch_id: batchId } }),
    alerts: await RiskAlert.count({ where: { batch_id: batchId } }),
  };
}

// published: 'yes' (published by the administrator) | 'shown' (on the homepage now) | 'no' | undefined
async function listBatches({ status = 'active', q, nurseryId, speciesId, stage, published } = {}) {
  const options = statusOptions(status);
  const where = { ...options.where };
  if (nurseryId) where.nursery_id = nurseryId;
  if (speciesId) where.species_id = speciesId;
  if (stage && stage !== 'all') where.stage = stage;
  if (published === 'yes' || published === 'shown') where.published_at = { [Op.ne]: null };
  if (published === 'no') where.published_at = null;
  if (q && q.trim()) where[Op.or] = [{ '$species.common_name$': { [Op.like]: like(q) } }, { '$nursery.name$': { [Op.like]: like(q) } }];
  const rows = await Batch.findAll({ where, paranoid: options.paranoid, include: batchIncludes(), order: [['id', 'DESC']], limit: 1000 });
  const committed = await committedForBatches(rows.map((b) => b.id));
  let items = rows.map((b) => batchJson(b, Math.max(0, b.quantity_current - committed.get(b.id))));
  if (published === 'shown') items = items.filter((b) => b.on_homepage);
  return { items, counts: await statusCounts(Batch) };
}

async function getBatch(id) {
  const batch = await findBatch(id);
  const committed = await committedForBatches([batch.id]);
  const adjustments = await StockAdjustment.findAll({ where: { batch_id: batch.id }, order: [['adjusted_at', 'DESC']], limit: 20 });
  return batchJson(batch, Math.max(0, batch.quantity_current - committed.get(batch.id)), {
    links: await batchLinks(batch.id),
    adjustments: adjustments.map((a) => ({ id: a.id, quantity_change: a.quantity_change, reason: a.reason, adjusted_at: a.adjusted_at })),
  });
}

// Safe fields: price per plant, and a quantity correction WITH a reason (saved as a stock change, so the
// batch history shows it; it can never go below the plants already promised). The plant type belongs to
// the species (Rules & species), not to one batch.
async function updateBatch(admin, id, data) {
  const batch = await findBatch(id);
  if (batch.archived_at) throw new HttpError(409, 'ARCHIVED', 'Unarchive the batch first');
  if (data.quantity_change) {
    await inventory.adjustStock(batch.nursery, admin, { batch_id: batch.id, quantity_change: data.quantity_change, reason: `${data.reason} (administrator)` });
  }
  if (data.unit_price !== undefined && data.unit_price !== batch.unit_price) {
    await batch.update({ unit_price: data.unit_price });
    await audit.log({ actorId: admin.id, action: 'batch.edited', entityType: 'batch', entityId: batch.id, reason: [`price ${batch.unit_price} -> ${data.unit_price}`, data.reason].filter(Boolean).join(' · ') });
  }
  return getBatch(id);
}

const batchName = (batch) => `#${batch.id} ${batch.species?.common_name || ''}`.trim();

async function archiveBatch(admin, id, reason) {
  const result = await sequelize.transaction(async (transaction) => {
    const batch = await findBatch(id, transaction, true);
    if (batch.archived_at) throw new HttpError(409, 'ALREADY_ARCHIVED', 'This batch is already archived');
    const released = await releaseForArchive({ batchId: batch.id }, reason, admin, transaction);
    await batch.destroy({ transaction });
    const logRow = await audit.log(
      { actorId: admin.id, action: 'batch.archived', entityType: 'batch', entityId: batch.id, reason: `${reason} · ${released.requestsCancelled} requests cancelled, ${released.listingsWithdrawn} listings withdrawn` },
      { transaction }
    );
    await tellOwner(batch.nursery?.owner_id, 'record_archived', { kind: 'batch', name: batchName(batch), reason }, logRow, transaction);
    return released;
  });
  dispatchSoon();
  return result;
}

async function unarchiveBatch(admin, id, reason) {
  await sequelize.transaction(async (transaction) => {
    const batch = await findBatch(id, transaction, true);
    if (!batch.archived_at) throw new HttpError(409, 'NOT_ARCHIVED', 'This batch is not archived');
    if (!batch.nursery || batch.nursery.archived_at) throw new HttpError(409, 'NURSERY_ARCHIVED', 'Unarchive the nursery first');
    await batch.restore({ transaction });
    const logRow = await audit.log({ actorId: admin.id, action: 'batch.unarchived', entityType: 'batch', entityId: batch.id, reason: reason || null }, { transaction });
    await tellOwner(batch.nursery.owner_id, 'record_restored', { kind: 'batch', name: batchName(batch), reason: reason || null }, logRow, transaction);
  });
  dispatchSoon();
}

async function deleteBatch(admin, id, reason) {
  const batch = await findBatch(id);
  refuseIfLinked(await batchLinks(batch.id));
  await sequelize.transaction(async (transaction) => {
    await batch.destroy({ force: true, transaction });
    await audit.log({ actorId: admin.id, action: 'batch.deleted', entityType: 'batch', entityId: batch.id, reason: `${reason} · was ${batchName(batch)}, ${batch.quantity_current} plants` }, { transaction });
  });
}

// ---- Homepage publishing (W48), one or many batches ----

async function publishBatches(admin, ids) {
  const batches = await Batch.findAll({ where: { id: { [Op.in]: ids } }, paranoid: false, include: batchIncludes() });
  const committed = await committedForBatches(batches.map((b) => b.id));
  const published = [];
  const blocked = [];
  for (const id of ids) {
    const batch = batches.find((b) => b.id === id);
    if (!batch) {
      blocked.push({ id, code: 'NOT_FOUND' });
      continue;
    }
    const code = publishBlockReason(batch, Math.max(0, batch.quantity_current - committed.get(batch.id)));
    if (code) {
      blocked.push({ id, code });
      continue;
    }
    if (!batch.published_at) {
      await batch.update({ published_at: new Date() });
      await audit.log({ actorId: admin.id, action: 'batch.published', entityType: 'batch', entityId: batch.id, reason: 'shown on the public homepage' });
    }
    published.push(id);
  }
  return { published, blocked };
}

async function unpublishBatches(admin, ids) {
  const batches = await Batch.findAll({ where: { id: { [Op.in]: ids }, published_at: { [Op.ne]: null } }, paranoid: false });
  for (const batch of batches) {
    await batch.update({ published_at: null, featured_rank: null });
    await audit.log({ actorId: admin.id, action: 'batch.unpublished', entityType: 'batch', entityId: batch.id, reason: 'removed from the public homepage' });
  }
  return { unpublished: batches.map((b) => b.id) };
}

// "Featured" position: 1 is shown first; null = not featured (after the featured ones)
async function setFeatured(admin, id, rank) {
  const batch = await findBatch(id);
  if (!batch.published_at) throw new HttpError(409, 'NOT_PUBLISHED', 'Publish the batch first');
  await batch.update({ featured_rank: rank });
  await audit.log({ actorId: admin.id, action: 'batch.featured', entityType: 'batch', entityId: batch.id, reason: rank ? `featured position ${rank}` : 'not featured' });
  return getBatch(id);
}

module.exports = {
  statusOptions,
  listNurseries,
  getNursery,
  updateNursery,
  archiveNursery,
  unarchiveNursery,
  deleteNursery,
  listInstitutions,
  getInstitution,
  updateInstitution,
  archiveInstitution,
  unarchiveInstitution,
  deleteInstitution,
  listBatches,
  getBatch,
  updateBatch,
  archiveBatch,
  unarchiveBatch,
  deleteBatch,
  publishBatches,
  unpublishBatches,
  setFeatured,
};

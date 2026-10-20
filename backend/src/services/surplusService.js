// SurplusService (Figure 7, Figures 10-11, FR09-FR12): listings, the Surplus Board, requests,
// decisions and the two-sided hand-over.
//
// Quantities of a listing:
//   reserved  = sum of pending + approved requests          (a valid request reserves plants, FR10)
//   fulfilled = sum of fulfilled requests                     (already handed over)
//   remaining = quantity_offered - reserved - fulfilled       (what institutions can still request)
// Every change that touches these numbers runs in a database transaction with the listing row
// locked, so two institutions requesting the last plants at the same moment cannot both get them.
const { Op } = require('sequelize');
const {
  sequelize,
  Batch,
  PlantSpecies,
  Nursery,
  Institution,
  User,
  SurplusListing,
  SurplusRequest,
  ImpactRecord,
} = require('../models');
const HttpError = require('../utils/httpError');
const { todayKigali } = require('../utils/dates');
const audit = require('./auditService');
const { notify, dispatchSoon } = require('./notificationService');
const { committedQuantity } = require('./stockService');
const { findOwnBatch } = require('./inventoryService');

const OPEN_REQUEST = ['pending', 'approved'];

async function quantities(listing, transaction) {
  const reserved = (await SurplusRequest.sum('quantity_requested', { where: { listing_id: listing.id, status: { [Op.in]: OPEN_REQUEST } }, transaction })) || 0;
  const fulfilled = (await SurplusRequest.sum('quantity_requested', { where: { listing_id: listing.id, status: 'fulfilled' }, transaction })) || 0;
  return { reserved, fulfilled, remaining: Math.max(0, listing.quantity_offered - reserved - fulfilled) };
}

// Keeps the listing status in line with its quantities (only for listings still on the board):
//   something left to request          -> active
//   nothing left, some still reserved  -> reserved
//   everything handed over             -> fulfilled
async function refreshListingStatus(listing, transaction) {
  if (!['active', 'reserved'].includes(listing.status)) return listing;
  const q = await quantities(listing, transaction);
  let status = 'active';
  if (q.remaining <= 0) status = q.reserved > 0 ? 'reserved' : 'fulfilled';
  if (status !== listing.status) await listing.update({ status }, { transaction });
  return listing;
}

const speciesInclude = { model: PlantSpecies, as: 'species', paranoid: false };
const listingInclude = [
  { model: Batch, as: 'batch', paranoid: false, include: [speciesInclude] },
  { model: Nursery, as: 'nursery', paranoid: false, include: [{ model: User, as: 'owner', attributes: ['id', 'full_name', 'phone', 'email'] }] },
];

async function listingJson(listing, transaction) {
  const q = await quantities(listing, transaction);
  const species = listing.batch?.species;
  return {
    id: listing.id,
    batch_id: listing.batch_id,
    nursery_id: listing.nursery_id,
    quantity_offered: listing.quantity_offered,
    ...q,
    offer_type: listing.offer_type,
    discounted_price: listing.discounted_price,
    pickup_note: listing.pickup_note,
    available_from: listing.available_from,
    expires_at: listing.expires_at,
    status: listing.status,
    created_at: listing.created_at,
    species: species ? { id: species.id, name: species.common_name, kinyarwanda_name: species.kinyarwanda_name, category: species.category } : null,
    batch_stage: listing.batch?.stage,
    nursery: listing.nursery
      ? {
          id: listing.nursery.id,
          name: listing.nursery.name,
          district: listing.nursery.district,
          sector: listing.nursery.sector,
          address_text: listing.nursery.address_text,
          latitude: listing.nursery.latitude === null ? null : Number(listing.nursery.latitude),
          longitude: listing.nursery.longitude === null ? null : Number(listing.nursery.longitude),
        }
      : null,
  };
}

// ---- Listings (nursery operator) ----

async function createListing(nursery, user, data) {
  return sequelize.transaction(async (transaction) => {
    const batch = await findOwnBatch(nursery, data.batch_id, { transaction, lock: true });
    if (batch.stage === 'cleared') throw new HttpError(409, 'BATCH_CLEARED', 'This batch is cleared');
    const available = batch.quantity_current - (await committedQuantity(batch.id, { transaction }));
    // The server refuses a listing larger than the available stock (FR09)
    if (data.quantity > available) {
      throw new HttpError(409, 'LISTING_EXCEEDS_STOCK', 'The listing is larger than the available stock', { available });
    }
    const today = todayKigali();
    const availableFrom = data.available_from || today;
    if (data.expires_at < today || data.expires_at < availableFrom) {
      throw new HttpError(400, 'VALIDATION_FAILED', 'The expiry date must be after the start date', { fields: { expires_at: 'date_in_past' } });
    }
    const listing = await SurplusListing.create(
      {
        batch_id: batch.id,
        nursery_id: nursery.id,
        quantity_offered: data.quantity,
        offer_type: data.offer_type,
        discounted_price: data.offer_type === 'discounted' ? data.discounted_price : null,
        pickup_note: data.pickup_note || null,
        available_from: availableFrom,
        expires_at: data.expires_at,
        status: 'active',
      },
      { transaction }
    );
    await audit.log({ actorId: user.id, action: 'listing.created', entityType: 'surplus_listing', entityId: listing.id }, { transaction });
    return listing;
  });
}

async function listOwnListings(nursery) {
  const listings = await SurplusListing.findAll({ where: { nursery_id: nursery.id }, include: listingInclude, order: [['created_at', 'DESC']] });
  const result = [];
  for (const listing of listings) result.push(await listingJson(listing));
  return result;
}

// Cancels the open requests of a listing and tells each institution.
async function cancelOpenRequests(listing, reason, actorId, transaction) {
  const open = await SurplusRequest.findAll({
    where: { listing_id: listing.id, status: { [Op.in]: OPEN_REQUEST } },
    include: [{ model: Institution, as: 'institution' }],
    transaction,
  });
  for (const request of open) {
    await request.update({ status: 'cancelled', decision_reason: reason, decided_at: new Date() }, { transaction });
    const logRow = await audit.log({ actorId, action: 'request.cancelled', entityType: 'surplus_request', entityId: request.id, reason }, { transaction });
    await notify(
      {
        userId: request.institution.user_id,
        type: 'request_decided',
        eventKey: `audit:${logRow.id}:user:${request.institution.user_id}`,
        payload: { request_id: request.id, decision: 'declined', reason, species: listing.batch?.species?.common_name, quantity: request.quantity_requested, nursery: listing.nursery?.name },
      },
      { transaction }
    );
  }
  return open.length;
}

// Withdraw (operator) or moderate (administrator, FR15). Open requests are cancelled and released.
async function withdrawListing({ nursery = null, user, listingId, reason }) {
  await sequelize.transaction(async (transaction) => {
    const where = { id: listingId };
    if (nursery) where.nursery_id = nursery.id;
    const listing = await SurplusListing.findOne({ where, include: listingInclude, transaction, lock: transaction.LOCK.UPDATE });
    if (!listing) throw new HttpError(404, 'NOT_FOUND', 'Listing not found');
    if (!['active', 'reserved'].includes(listing.status)) throw new HttpError(409, 'LISTING_CLOSED', 'This listing is already closed');
    await cancelOpenRequests(listing, reason || 'Listing withdrawn', user.id, transaction);
    await listing.update({ status: 'withdrawn' }, { transaction });
    await audit.log({ actorId: user.id, action: user.role === 'admin' ? 'listing.moderated' : 'listing.withdrawn', entityType: 'surplus_listing', entityId: listing.id, reason }, { transaction });
  });
  dispatchSoon();
}

// Nightly: listings past their expiry date close, and their open requests are cancelled (F6).
async function expireListings({ today = todayKigali() } = {}) {
  const due = await SurplusListing.findAll({
    where: { status: { [Op.in]: ['active', 'reserved'] }, expires_at: { [Op.lt]: today } },
    include: listingInclude,
  });
  for (const listing of due) {
    await sequelize.transaction(async (transaction) => {
      await cancelOpenRequests(listing, 'Listing expired', null, transaction);
      await listing.update({ status: 'expired' }, { transaction });
      const logRow = await audit.log({ actorId: null, action: 'listing.expired', entityType: 'surplus_listing', entityId: listing.id }, { transaction });
      await notify(
        {
          userId: listing.nursery.owner_id,
          type: 'listing_expired',
          eventKey: `audit:${logRow.id}:user:${listing.nursery.owner_id}`,
          payload: { listing_id: listing.id, species: listing.batch?.species?.common_name },
        },
        { transaction }
      );
    });
  }
  if (due.length) dispatchSoon();
  return due.length;
}

// ---- Surplus Board (FR10) ----

async function board({ district, category, speciesId } = {}) {
  const today = todayKigali();
  const nurseryWhere = { verification_status: 'approved' };
  if (district) nurseryWhere.district = district;
  const speciesWhere = {};
  if (category) speciesWhere.category = category;
  if (speciesId) speciesWhere.id = speciesId;

  const listings = await SurplusListing.findAll({
    where: { status: 'active', expires_at: { [Op.gte]: today } },
    include: [
      { model: Batch, as: 'batch', required: true, include: [{ ...speciesInclude, where: speciesWhere, required: true }] },
      { model: Nursery, as: 'nursery', required: true, where: nurseryWhere },
    ],
    order: [['expires_at', 'ASC']],
  });
  const result = [];
  for (const listing of listings) {
    const json = await listingJson(listing);
    if (json.remaining > 0) result.push(json);
  }
  return result;
}

// ---- Requests ----

const requestInclude = [
  { model: SurplusListing, as: 'listing', paranoid: false, include: listingInclude },
  { model: Institution, as: 'institution', include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'email'] }] },
];

function requestJson(request, viewer) {
  const listing = request.listing;
  const approvedOrDone = ['approved', 'fulfilled'].includes(request.status);
  return {
    id: request.id,
    listing_id: request.listing_id,
    quantity_requested: request.quantity_requested,
    purpose: request.purpose,
    status: request.status,
    decision_reason: request.decision_reason,
    decided_at: request.decided_at,
    nursery_confirmed_at: request.nursery_confirmed_at,
    institution_confirmed_at: request.institution_confirmed_at,
    fulfilled_at: request.fulfilled_at,
    planting_site: request.planting_site,
    planting_district: request.planting_district,
    land_cleared_sqm: request.land_cleared_sqm === null ? null : Number(request.land_cleared_sqm),
    created_at: request.created_at,
    species: listing?.batch?.species?.common_name || null,
    offer_type: listing?.offer_type,
    discounted_price: listing?.discounted_price,
    pickup_note: listing?.pickup_note,
    nursery: listing?.nursery
      ? {
          name: listing.nursery.name,
          district: listing.nursery.district,
          sector: listing.nursery.sector,
          address_text: listing.nursery.address_text,
          // Contact details are shared only after the operator approves the request
          contact_name: viewer === 'operator' || approvedOrDone ? listing.nursery.owner?.full_name : null,
          contact_phone: viewer === 'operator' || approvedOrDone ? listing.nursery.owner?.phone : null,
        }
      : null,
    institution: request.institution
      ? {
          name: request.institution.org_name,
          org_type: request.institution.org_type,
          district: request.institution.district,
          sector: request.institution.sector,
          contact_name: request.institution.user?.full_name,
          contact_phone: request.institution.contact_phone || request.institution.user?.phone || null,
        }
      : null,
  };
}

// A verified institution requests plants (FR10). Same institution + same listing:
//   an open request exists      -> it is returned (no duplicate)
//   a closed request exists     -> that row is reopened (the pair is unique in the database)
async function requestPlants(institution, user, listingId, { quantity, purpose }) {
  const result = await sequelize.transaction(async (transaction) => {
    const listing = await SurplusListing.findByPk(listingId, { include: listingInclude, transaction, lock: transaction.LOCK.UPDATE });
    if (!listing || listing.nursery?.verification_status !== 'approved') throw new HttpError(404, 'NOT_FOUND', 'Listing not found');

    const existing = await SurplusRequest.findOne({ where: { listing_id: listing.id, institution_id: institution.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (existing && OPEN_REQUEST.includes(existing.status)) return { request: existing, duplicate: true };
    if (existing && existing.status === 'fulfilled') throw new HttpError(409, 'ALREADY_FULFILLED', 'You already received plants from this listing');

    if (listing.status !== 'active' || listing.expires_at < todayKigali()) throw new HttpError(409, 'LISTING_CLOSED', 'This listing is no longer open');
    const { remaining } = await quantities(listing, transaction);
    if (quantity > remaining) throw new HttpError(409, 'NOT_ENOUGH_LEFT', 'Not enough plants left on this listing', { remaining });

    const fields = {
      quantity_requested: quantity,
      purpose,
      status: 'pending',
      decision_reason: null,
      decided_at: null,
      nursery_confirmed_at: null,
      institution_confirmed_at: null,
      planting_site: null,
      planting_district: null,
      land_cleared_sqm: null,
    };
    const request = existing
      ? await existing.update(fields, { transaction })
      : await SurplusRequest.create({ listing_id: listing.id, institution_id: institution.id, ...fields }, { transaction });

    await refreshListingStatus(listing, transaction);
    const logRow = await audit.log({ actorId: user.id, action: 'request.created', entityType: 'surplus_request', entityId: request.id }, { transaction });
    await notify(
      {
        userId: listing.nursery.owner_id,
        type: 'request_created',
        eventKey: `audit:${logRow.id}:user:${listing.nursery.owner_id}`,
        payload: { request_id: request.id, institution: institution.org_name, quantity, species: listing.batch?.species?.common_name, purpose },
      },
      { transaction }
    );
    return { request, duplicate: false };
  });
  if (!result.duplicate) dispatchSoon();
  return result;
}

async function findRequestForNursery(nursery, requestId, transaction) {
  const request = await SurplusRequest.findByPk(requestId, { include: requestInclude, transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (!request || request.listing?.nursery_id !== nursery.id) throw new HttpError(404, 'NOT_FOUND', 'Request not found');
  return request;
}

async function findRequestForInstitution(institution, requestId, transaction) {
  const request = await SurplusRequest.findByPk(requestId, { include: requestInclude, transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (!request || request.institution_id !== institution.id) throw new HttpError(404, 'NOT_FOUND', 'Request not found');
  return request;
}

// The operator approves or declines (FR11). Declining releases the reserved plants.
async function decideRequest(nursery, user, requestId, decision, reason) {
  await sequelize.transaction(async (transaction) => {
    const request = await findRequestForNursery(nursery, requestId, transaction);
    if (request.status !== 'pending') throw new HttpError(409, 'ALREADY_DECIDED', 'This request was already decided');
    const status = decision === 'approve' ? 'approved' : 'declined';
    await request.update({ status, decision_reason: reason || null, decided_at: new Date() }, { transaction });
    await refreshListingStatus(request.listing, transaction);
    const logRow = await audit.log({ actorId: user.id, action: `request.${status}`, entityType: 'surplus_request', entityId: request.id, reason }, { transaction });
    await notify(
      {
        userId: request.institution.user_id,
        type: 'request_decided',
        eventKey: `audit:${logRow.id}:user:${request.institution.user_id}`,
        payload: { request_id: request.id, decision: status, reason: reason || null, species: request.listing.batch?.species?.common_name, quantity: request.quantity_requested, nursery: nursery.name },
      },
      { transaction }
    );
  });
  dispatchSoon();
}

// The institution cancels its own open request; the plants are released.
async function cancelRequest(institution, user, requestId, reason) {
  await sequelize.transaction(async (transaction) => {
    const request = await findRequestForInstitution(institution, requestId, transaction);
    if (!OPEN_REQUEST.includes(request.status)) throw new HttpError(409, 'REQUEST_CLOSED', 'This request is already closed');
    await request.update({ status: 'cancelled', decision_reason: reason || null }, { transaction });
    await refreshListingStatus(request.listing, transaction);
    const logRow = await audit.log({ actorId: user.id, action: 'request.cancelled', entityType: 'surplus_request', entityId: request.id, reason }, { transaction });
    const ownerId = request.listing.nursery.owner_id;
    await notify(
      {
        userId: ownerId,
        type: 'request_cancelled',
        eventKey: `audit:${logRow.id}:user:${ownerId}`,
        payload: { request_id: request.id, institution: institution.org_name, species: request.listing.batch?.species?.common_name, quantity: request.quantity_requested },
      },
      { transaction }
    );
  });
  dispatchSoon();
}

// Both sides confirm the hand-over (FR11). Only when BOTH have confirmed does the system
// reduce the batch stock permanently, mark the request fulfilled and create the impact record (FR12).
async function confirmHandover({ side, nursery, institution, user, requestId, details }) {
  let completed = false;
  await sequelize.transaction(async (transaction) => {
    const request = side === 'nursery'
      ? await findRequestForNursery(nursery, requestId, transaction)
      : await findRequestForInstitution(institution, requestId, transaction);
    if (request.status !== 'approved') throw new HttpError(409, 'NOT_APPROVED_YET', 'Only an approved request can be handed over');

    if (side === 'nursery') {
      if (request.nursery_confirmed_at) return; // already confirmed: nothing to do
      await request.update({ nursery_confirmed_at: new Date(), land_cleared_sqm: details.land_cleared_sqm ?? 0 }, { transaction });
    } else {
      if (request.institution_confirmed_at) return;
      await request.update(
        { institution_confirmed_at: new Date(), planting_site: details.planting_site, planting_district: details.planting_district || request.institution.district },
        { transaction }
      );
    }
    const logRow = await audit.log({ actorId: user.id, action: `handover.confirmed_by_${side}`, entityType: 'surplus_request', entityId: request.id }, { transaction });
    const species = request.listing.batch?.species?.common_name;
    const nurseryUserId = request.listing.nursery.owner_id;
    const institutionUserId = request.institution.user_id;

    if (!(request.nursery_confirmed_at && request.institution_confirmed_at)) {
      // Waiting for the other side: tell them
      const otherUserId = side === 'nursery' ? institutionUserId : nurseryUserId;
      await notify(
        { userId: otherUserId, type: 'handover_confirmed', eventKey: `audit:${logRow.id}:user:${otherUserId}`, payload: { request_id: request.id, species, quantity: request.quantity_requested, by: side } },
        { transaction }
      );
      return;
    }

    // ---- Both confirmed: complete the hand-over ----
    const batch = await Batch.findByPk(request.listing.batch_id, { transaction, lock: transaction.LOCK.UPDATE, paranoid: false });
    if (batch.quantity_current < request.quantity_requested) {
      throw new HttpError(409, 'STOCK_TOO_LOW', 'The batch no longer has enough plants for this hand-over');
    }
    const newStock = batch.quantity_current - request.quantity_requested;
    // Figure 10: "clear batch when stock is zero"
    await batch.update({ quantity_current: newStock, ...(newStock === 0 ? { stage: 'cleared' } : {}) }, { transaction });
    await request.update({ status: 'fulfilled', fulfilled_at: new Date() }, { transaction });
    await ImpactRecord.create(
      {
        request_id: request.id,
        quantity_delivered: request.quantity_requested,
        planting_site: request.planting_site,
        district: request.planting_district,
        land_cleared_sqm: request.land_cleared_sqm ?? 0,
        recorded_at: new Date(),
      },
      { transaction }
    );
    await refreshListingStatus(request.listing, transaction);
    const doneLog = await audit.log({ actorId: user.id, action: 'handover.completed', entityType: 'surplus_request', entityId: request.id }, { transaction });
    if (newStock === 0) await audit.log({ actorId: null, action: 'batch.cleared', entityType: 'batch', entityId: batch.id, reason: 'stock reached zero after hand-over' }, { transaction });
    for (const userId of [nurseryUserId, institutionUserId]) {
      await notify(
        { userId, type: 'handover_completed', eventKey: `audit:${doneLog.id}:user:${userId}`, payload: { request_id: request.id, species, quantity: request.quantity_requested } },
        { transaction }
      );
    }
    completed = true;
  });
  dispatchSoon();
  return { completed };
}

async function listRequestsForNursery(nursery, { status } = {}) {
  const where = {};
  if (status && status !== 'all') where.status = status;
  const rows = await SurplusRequest.findAll({
    where,
    include: [
      { ...requestInclude[0], where: { nursery_id: nursery.id }, required: true },
      requestInclude[1],
    ],
    order: [['created_at', 'DESC']],
  });
  return rows.map((r) => requestJson(r, 'operator'));
}

async function listRequestsForInstitution(institution, { status } = {}) {
  const where = { institution_id: institution.id };
  if (status && status !== 'all') where.status = status;
  const rows = await SurplusRequest.findAll({ where, include: requestInclude, order: [['created_at', 'DESC']] });
  return rows.map((r) => requestJson(r, 'institution'));
}

module.exports = {
  quantities,
  refreshListingStatus,
  createListing,
  listOwnListings,
  withdrawListing,
  expireListings,
  board,
  requestPlants,
  decideRequest,
  cancelRequest,
  confirmHandover,
  listRequestsForNursery,
  listRequestsForInstitution,
  listingJson,
  listingInclude,
};

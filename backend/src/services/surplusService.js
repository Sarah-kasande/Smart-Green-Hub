// SurplusService (Figure 7, Figures 10-11, FR09-FR12): listings, the Surplus Board, requests,
// decisions and the two-sided hand-over. Requests can be for a surplus listing or, since W42,
// directly for a ready batch shown as "Available plants"; both share the same request code.
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
  RiskAlert,
} = require('../models');
const HttpError = require('../utils/httpError');
const { todayKigali } = require('../utils/dates');
const audit = require('./auditService');
const { notify, dispatchSoon } = require('./notificationService');
const { committedQuantity, availableQuantity } = require('./stockService');
const availablePlants = require('./availablePlantsService');
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

// The includes are FUNCTIONS that return a NEW object on every call, never shared objects.
// Why: Sequelize copies the include options with lodash cloneDeep, which keeps an object that is used
// twice as ONE object. A request reaches a batch and its species by two paths (through its listing,
// and directly for available plants). With one shared species object, both joins got the same parent
// and the same SQL alias 'batch->species', and MySQL refused the query ("Not unique table/alias").
const speciesInclude = () => ({ model: PlantSpecies, as: 'species', paranoid: false });
const nurseryInclude = () => ({ model: Nursery, as: 'nursery', paranoid: false, include: [{ model: User, as: 'owner', paranoid: false, attributes: ['id', 'full_name', 'phone', 'email'] }] });
const listingInclude = () => [
  { model: Batch, as: 'batch', paranoid: false, include: [speciesInclude()] },
  nurseryInclude(),
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
    // A batch whose species is not approved yet (or was rejected) cannot be offered (W39)
    if (batch.species?.status !== 'approved') throw new HttpError(409, 'SPECIES_NOT_APPROVED', 'The species of this batch is not approved yet');
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
  const listings = await SurplusListing.findAll({ where: { nursery_id: nursery.id }, include: listingInclude(), order: [['created_at', 'DESC']] });
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
    const listing = await SurplusListing.findOne({ where, include: listingInclude(), transaction, lock: transaction.LOCK.UPDATE });
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
    include: listingInclude(),
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
      { model: Batch, as: 'batch', required: true, include: [{ ...speciesInclude(), where: speciesWhere, required: true }] },
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
// A request is for ONE item (docs/DEVIATIONS.md W42):
//   a surplus offer    -> listing_id is set (the batch is the listing's batch)
//   an available plant -> batch_id is set (a ready batch shown in "Available plants")
// Everything after that is the same for both: statuses, reservation in a transaction with the item
// locked (no overselling), approve / decline with a reason, one request per institution per item,
// and stock reduced only when BOTH sides confirmed the hand-over.

// Two paths to a batch, with different aliases: 'listing->batch' (surplus offer) and 'batch' (available plant).
// Each path gets its own new include objects (see speciesInclude above).
const requestInclude = () => [
  { model: SurplusListing, as: 'listing', paranoid: false, include: listingInclude() },
  { model: Batch, as: 'batch', paranoid: false, include: [speciesInclude(), nurseryInclude()] },
  // paranoid: false everywhere: an archived listing, batch, species, nursery, institution or account never
  // removes a request from either side's history; it keeps its names and numbers.
  { model: Institution, as: 'institution', paranoid: false, include: [{ model: User, as: 'user', paranoid: false, attributes: ['id', 'full_name', 'phone', 'email'] }] },
];

// The batch, nursery and source of a request, whichever item it is for
const requestBatch = (request) => request.listing?.batch || request.batch || null;
const requestNursery = (request) => request.listing?.nursery || request.batch?.nursery || null;
const requestSource = (request) => (request.listing_id ? 'surplus_offer' : 'available_plant');

function requestJson(request, viewer) {
  const listing = request.listing;
  const batch = requestBatch(request);
  const nursery = requestNursery(request);
  const approvedOrDone = ['approved', 'fulfilled'].includes(request.status);
  return {
    id: request.id,
    source: requestSource(request),
    listing_id: request.listing_id,
    batch_id: request.batch_id,
    quantity_requested: request.quantity_requested,
    purpose: request.purpose,
    preferred_pickup_date: request.preferred_pickup_date,
    message: request.message,
    status: request.status,
    decision_reason: request.decision_reason,
    decided_at: request.decided_at,
    nursery_confirmed_at: request.nursery_confirmed_at,
    institution_confirmed_at: request.institution_confirmed_at,
    fulfilled_at: request.fulfilled_at,
    // When a declined or cancelled request was closed (older cancelled rows have no decided_at: last change)
    closed_at: ['declined', 'cancelled'].includes(request.status) ? request.decided_at || request.updated_at : null,
    planting_site: request.planting_site,
    planting_district: request.planting_district,
    land_cleared_sqm: request.land_cleared_sqm === null ? null : Number(request.land_cleared_sqm),
    created_at: request.created_at,
    species: batch?.species?.common_name || null,
    offer_type: listing?.offer_type || null,
    discounted_price: listing?.discounted_price ?? null,
    // Available plants: the nursery's price per plant, only if it entered one
    unit_price: !listing && batch?.unit_price > 0 ? batch.unit_price : null,
    pickup_note: listing?.pickup_note || null,
    nursery: nursery
      ? {
          name: nursery.name,
          district: nursery.district,
          sector: nursery.sector,
          address_text: nursery.address_text,
          // Contact details are shared only after the operator approves the request
          contact_name: viewer === 'operator' || approvedOrDone ? nursery.owner?.full_name : null,
          contact_phone: viewer === 'operator' || approvedOrDone ? nursery.owner?.phone : null,
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

// The item being requested, locked for the rest of the transaction. Returns
//   { key, nursery, species, remaining, refresh }
//   key       { listing_id } or { batch_id }: the columns that identify the item on a request
//   remaining how many plants can still be requested
//   refresh   called after a change (updates the listing status; nothing to do for a batch)
async function lockListingItem(listingId, transaction) {
  const listing = await SurplusListing.findByPk(listingId, { include: listingInclude(), transaction, lock: transaction.LOCK.UPDATE });
  if (!listing || listing.nursery?.verification_status !== 'approved') throw new HttpError(404, 'NOT_FOUND', 'Listing not found');
  return {
    key: { listing_id: listing.id },
    nursery: listing.nursery,
    species: listing.batch?.species,
    checkOpen: () => {
      if (listing.status !== 'active' || listing.expires_at < todayKigali()) throw new HttpError(409, 'LISTING_CLOSED', 'This listing is no longer open');
    },
    remaining: async () => (await quantities(listing, transaction)).remaining,
    refresh: () => refreshListingStatus(listing, transaction),
  };
}

async function lockBatchItem(batchId, transaction) {
  const batch = await Batch.findByPk(batchId, { include: [speciesInclude(), nurseryInclude()], transaction, lock: transaction.LOCK.UPDATE });
  if (!batch || batch.nursery?.verification_status !== 'approved') throw new HttpError(404, 'NOT_FOUND', 'Not found');
  return {
    key: { batch_id: batch.id },
    nursery: batch.nursery,
    species: batch.species,
    // Hidden by the nursery, no longer ready, or species not approved: not available any more
    checkOpen: () => {
      if (!availablePlants.isShown(batch)) throw new HttpError(409, 'NOT_AVAILABLE', 'These plants are no longer available');
    },
    remaining: () => availableQuantity(batch, { transaction }),
    refresh: async () => {},
  };
}

// A verified institution requests plants (FR10, W42). target: { listingId } or { batchId }.
// Same institution + same item:
//   an open request exists      -> it is returned (no duplicate)
//   a closed request exists     -> that row is reopened (the pair is unique in the database)
async function requestPlants(institution, user, target, { quantity, purpose, preferred_pickup_date: pickupDate, message }) {
  const result = await sequelize.transaction(async (transaction) => {
    // Locking the listing or batch row first makes two institutions asking at the same moment
    // wait for each other, so the second one sees the plants the first one reserved.
    const item = target.batchId ? await lockBatchItem(target.batchId, transaction) : await lockListingItem(target.listingId, transaction);

    const existing = await SurplusRequest.findOne({ where: { ...item.key, institution_id: institution.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (existing && OPEN_REQUEST.includes(existing.status)) return { request: existing, duplicate: true };
    if (existing && existing.status === 'fulfilled') throw new HttpError(409, 'ALREADY_FULFILLED', 'You already received plants from this listing');

    item.checkOpen();
    const remaining = await item.remaining();
    if (quantity > remaining) throw new HttpError(409, 'NOT_ENOUGH_LEFT', 'Not enough plants left', { remaining });

    const fields = {
      quantity_requested: quantity,
      purpose,
      preferred_pickup_date: pickupDate || null,
      message: message || null,
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
      : await SurplusRequest.create({ ...item.key, institution_id: institution.id, ...fields }, { transaction });

    await item.refresh();
    const source = item.key.batch_id ? 'available_plant' : 'surplus_offer';
    const logRow = await audit.log({ actorId: user.id, action: 'request.created', entityType: 'surplus_request', entityId: request.id, reason: source }, { transaction });
    await notify(
      {
        userId: item.nursery.owner_id,
        type: 'request_created',
        eventKey: `audit:${logRow.id}:user:${item.nursery.owner_id}`,
        payload: { request_id: request.id, institution: institution.org_name, quantity, species: item.species?.common_name, purpose, source },
      },
      { transaction }
    );
    return { request, duplicate: false };
  });
  if (!result.duplicate) dispatchSoon();
  return result;
}

async function findRequestForNursery(nursery, requestId, transaction) {
  const request = await SurplusRequest.findByPk(requestId, { include: requestInclude(), transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (!request || requestNursery(request)?.id !== nursery.id) throw new HttpError(404, 'NOT_FOUND', 'Request not found');
  return request;
}

async function findRequestForInstitution(institution, requestId, transaction) {
  const request = await SurplusRequest.findByPk(requestId, { include: requestInclude(), transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (!request || request.institution_id !== institution.id) throw new HttpError(404, 'NOT_FOUND', 'Request not found');
  return request;
}

// Keeps a listing's status in line after a request changed (requests for a batch have no listing)
const refreshAfter = (request, transaction) => (request.listing ? refreshListingStatus(request.listing, transaction) : null);

// The operator approves or declines (FR11). Declining releases the reserved plants.
async function decideRequest(nursery, user, requestId, decision, reason) {
  await sequelize.transaction(async (transaction) => {
    const request = await findRequestForNursery(nursery, requestId, transaction);
    if (request.status !== 'pending') throw new HttpError(409, 'ALREADY_DECIDED', 'This request was already decided');
    const status = decision === 'approve' ? 'approved' : 'declined';
    await request.update({ status, decision_reason: reason || null, decided_at: new Date() }, { transaction });
    await refreshAfter(request, transaction);
    const logRow = await audit.log({ actorId: user.id, action: `request.${status}`, entityType: 'surplus_request', entityId: request.id, reason }, { transaction });
    await notify(
      {
        userId: request.institution.user_id,
        type: 'request_decided',
        eventKey: `audit:${logRow.id}:user:${request.institution.user_id}`,
        payload: { request_id: request.id, decision: status, reason: reason || null, species: requestBatch(request)?.species?.common_name, quantity: request.quantity_requested, nursery: nursery.name },
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
    // decided_at = when the request was closed, so the history shows the date
    await request.update({ status: 'cancelled', decision_reason: reason || null, decided_at: new Date() }, { transaction });
    await refreshAfter(request, transaction);
    const logRow = await audit.log({ actorId: user.id, action: 'request.cancelled', entityType: 'surplus_request', entityId: request.id, reason }, { transaction });
    const ownerId = requestNursery(request).owner_id;
    await notify(
      {
        userId: ownerId,
        type: 'request_cancelled',
        eventKey: `audit:${logRow.id}:user:${ownerId}`,
        payload: { request_id: request.id, institution: institution.org_name, species: requestBatch(request)?.species?.common_name, quantity: request.quantity_requested },
      },
      { transaction }
    );
  });
  dispatchSoon();
}

// What a completed hand-over means for impact (W44):
//   surplus_redirected  from a surplus offer, or from a batch that was surplus anyway
//                       (overgrown, or with an open Medium/High risk alert at the hand-over)
//   greening_supply     plants from healthy stock ("Available plants"): NOT saved from waste
async function impactTypeFor(request, batch, transaction) {
  if (request.listing_id) return 'surplus_redirected';
  if (batch.stage === 'overgrown') return 'surplus_redirected';
  const alert = await RiskAlert.findOne({ where: { batch_id: batch.id, status: { [Op.in]: ['open', 'acknowledged'] } }, transaction });
  return alert ? 'surplus_redirected' : 'greening_supply';
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
    const species = requestBatch(request)?.species?.common_name;
    const nurseryUserId = requestNursery(request).owner_id;
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
    const batchId = request.listing ? request.listing.batch_id : request.batch_id;
    const batch = await Batch.findByPk(batchId, { transaction, lock: transaction.LOCK.UPDATE, paranoid: false });
    if (batch.quantity_current < request.quantity_requested) {
      throw new HttpError(409, 'STOCK_TOO_LOW', 'The batch no longer has enough plants for this hand-over');
    }
    // Decided before the stock changes (a batch emptied by this hand-over becomes "cleared")
    const impactType = await impactTypeFor(request, batch, transaction);
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
        impact_type: impactType,
      },
      { transaction }
    );
    await refreshAfter(request, transaction);
    const doneLog = await audit.log({ actorId: user.id, action: 'handover.completed', entityType: 'surplus_request', entityId: request.id, reason: impactType }, { transaction });
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

// Requests for this nursery's surplus offers AND its available plants, in one list
function nurseryRequestWhere(nursery) {
  return { [Op.or]: [{ '$listing.nursery_id$': nursery.id }, { '$batch.nursery_id$': nursery.id }] };
}

async function listRequestsForNursery(nursery, { status } = {}) {
  const where = nurseryRequestWhere(nursery);
  if (status && status !== 'all') where.status = status;
  const rows = await SurplusRequest.findAll({ where, include: requestInclude(), order: [['created_at', 'DESC'], ['id', 'DESC']] });
  return rows.map((r) => requestJson(r, 'operator'));
}

async function countPendingForNursery(nursery) {
  return SurplusRequest.count({
    where: { ...nurseryRequestWhere(nursery), status: 'pending' },
    include: [
      { model: SurplusListing, as: 'listing', attributes: [], paranoid: false },
      { model: Batch, as: 'batch', attributes: [], paranoid: false },
    ],
  });
}

async function listRequestsForInstitution(institution, { status } = {}) {
  const where = { institution_id: institution.id };
  if (status && status !== 'all') where.status = status;
  const rows = await SurplusRequest.findAll({ where, include: requestInclude(), order: [['created_at', 'DESC'], ['id', 'DESC']] });
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
  countPendingForNursery,
  listRequestsForInstitution,
  requestSource,
  listingJson,
  listingInclude,
};

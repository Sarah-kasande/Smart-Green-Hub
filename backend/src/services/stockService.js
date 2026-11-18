// How much of a batch is free to sell or to offer on the Surplus Board.
//
// committed = plants promised that have not been handed over yet:
//             for every active or reserved Surplus Board listing of the batch,
//               quantity_offered minus what was already handed over (fulfilled requests),
//             plus every OPEN request (pending or approved) for the batch from "Available plants"
//               (requests straight to the batch, docs/DEVIATIONS.md W42)
// available = quantity_current - committed      (docs/DEVIATIONS.md F5)
// The same number is used for sales, stock changes, new listings and "Available plants", so the
// same plants can never be promised twice.
//
// Stock itself (quantity_current) only goes down for a surplus listing when BOTH parties confirm
// the hand-over (FR11), so until then the plants are still counted in stock but are not sellable.
const { Op, fn, col } = require('sequelize');
const { SurplusListing, SurplusRequest } = require('../models');

async function committedQuantity(batchId, { transaction, excludeListingId } = {}) {
  const where = { batch_id: batchId, status: { [Op.in]: ['active', 'reserved'] } };
  if (excludeListingId) where.id = { [Op.ne]: excludeListingId };
  const listings = await SurplusListing.findAll({ where, transaction });
  let committed = 0;
  for (const listing of listings) {
    const handedOver = await SurplusRequest.sum('quantity_requested', {
      where: { listing_id: listing.id, status: 'fulfilled' },
      transaction,
    });
    committed += Math.max(0, listing.quantity_offered - (handedOver || 0));
  }
  const reservedDirectly = await SurplusRequest.sum('quantity_requested', {
    where: { batch_id: batchId, status: { [Op.in]: ['pending', 'approved'] } },
    transaction,
  });
  return committed + (reservedDirectly || 0);
}

async function availableQuantity(batch, options = {}) {
  return Math.max(0, batch.quantity_current - (await committedQuantity(batch.id, options)));
}

// The same "committed" number for MANY batches at once (the administrator's list of every batch).
// Same rule as committedQuantity above, but with 3 queries in total instead of 2-3 per batch.
// Returns a Map: batch id -> committed plants.
async function committedForBatches(batchIds) {
  const committed = new Map(batchIds.map((id) => [id, 0]));
  if (batchIds.length === 0) return committed;
  const sum = [fn('SUM', col('quantity_requested')), 'total'];

  const listings = await SurplusListing.findAll({
    where: { batch_id: { [Op.in]: batchIds }, status: { [Op.in]: ['active', 'reserved'] } },
    attributes: ['id', 'batch_id', 'quantity_offered'],
    raw: true,
  });
  const handedOver = new Map();
  if (listings.length) {
    const rows = await SurplusRequest.findAll({
      where: { listing_id: { [Op.in]: listings.map((l) => l.id) }, status: 'fulfilled' },
      attributes: ['listing_id', sum],
      group: ['listing_id'],
      raw: true,
    });
    for (const r of rows) handedOver.set(r.listing_id, Number(r.total));
  }
  for (const l of listings) {
    committed.set(l.batch_id, committed.get(l.batch_id) + Math.max(0, l.quantity_offered - (handedOver.get(l.id) || 0)));
  }

  const direct = await SurplusRequest.findAll({
    where: { batch_id: { [Op.in]: batchIds }, status: { [Op.in]: ['pending', 'approved'] } },
    attributes: ['batch_id', sum],
    group: ['batch_id'],
    raw: true,
  });
  for (const r of direct) committed.set(r.batch_id, committed.get(r.batch_id) + Number(r.total));
  return committed;
}

module.exports = { committedQuantity, availableQuantity, committedForBatches };

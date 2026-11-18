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
const { Op } = require('sequelize');
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

module.exports = { committedQuantity, availableQuantity };

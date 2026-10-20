// How much of a batch is free to sell or to offer on the Surplus Board.
//
// committed = plants promised on the Surplus Board that have not been handed over yet:
//             for every active or reserved listing of the batch,
//             quantity_offered minus what was already handed over (fulfilled requests).
// available = quantity_current - committed      (docs/DEVIATIONS.md F5)
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
  return committed;
}

async function availableQuantity(batch, options = {}) {
  return Math.max(0, batch.quantity_current - (await committedQuantity(batch.id, options)));
}

module.exports = { committedQuantity, availableQuantity };

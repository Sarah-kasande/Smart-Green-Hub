// HomepageService: batches the administrator publishes on the public homepage, "Plants available now"
// (docs/DEVIATIONS.md W48). Request-and-approve only: visitors sign in and send a request that the
// nursery approves; no payment or delivery step exists.
//
// A batch can be PUBLISHED, and a published batch is SHOWN, only while ALL of these are true:
//   - it is not archived and its stage is "ready"
//   - its species is approved
//   - it has free plants: stock minus plants promised on listings and in open requests (stockService)
//   - its nursery is approved, not archived, and agreed: "Allow my plants to appear on the public
//     homepage" (nurseries.show_on_homepage, OFF by default)
// So a batch that is sold out, archived, unpublished or no longer ready disappears by itself.
//
// The public answer contains ONLY: species, plant type, quantity available, price per plant (if set),
// end of the prime window (and how far the prime window has passed, for the progress bar), the nursery's
// name and district. Never phone, email, sales, risk, alerts, total stock or the exact location.
const { Op, literal } = require('sequelize');
const { Batch, Nursery, PlantSpecies } = require('../models');
const { HOMEPAGE_STAGES } = require('../utils/constants');
const { todayKigali, daysBetween } = require('../utils/dates');
const { committedForBatches } = require('./stockService');
const { quote } = require('../utils/sqlDialect');

// Why a batch cannot be published (null = it can). The batch must be loaded with species and nursery
// (paranoid: false, so an archived nursery is seen and named as the reason).
function publishBlockReason(batch, free) {
  if (batch.archived_at) return 'BATCH_ARCHIVED';
  if (!batch.nursery || batch.nursery.archived_at) return 'NURSERY_ARCHIVED';
  if (batch.nursery.verification_status !== 'approved') return 'NURSERY_NOT_APPROVED';
  if (!batch.nursery.show_on_homepage) return 'NURSERY_NO_CONSENT';
  if (batch.species?.status !== 'approved') return 'SPECIES_NOT_APPROVED';
  if (!HOMEPAGE_STAGES.includes(batch.stage)) return 'NOT_READY';
  if (free <= 0) return 'NO_STOCK';
  return null;
}

// How much of the prime window (ready date -> prime end) has passed, 0-100, for the progress bar
function primeProgress(readyDate, primeEnd, today = todayKigali()) {
  if (!readyDate || !primeEnd) return null;
  const total = daysBetween(readyDate, primeEnd);
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((daysBetween(readyDate, today) / total) * 100)));
}

// The public card: ONLY the allowed fields (no ids, no stock total, no contact, no location)
function publicCard(batch, free, today = todayKigali()) {
  return {
    species: { name: batch.species.common_name, kinyarwanda_name: batch.species.kinyarwanda_name || null },
    category: batch.species.category,
    available: free,
    unit_price: batch.unit_price > 0 ? batch.unit_price : null,
    prime_end_date: batch.prime_end_date,
    prime_progress: primeProgress(batch.expected_ready_date, batch.prime_end_date, today),
    nursery: { name: batch.nursery.name, district: batch.nursery.district },
  };
}

// Featured first (1, 2, 3 ...), then the rest, newest published first
const FEATURED_ORDER = [
  [literal(`${quote('Batch')}.${quote('featured_rank')} IS NULL`), 'ASC'],
  ['featured_rank', 'ASC'],
  ['published_at', 'DESC'],
  ['id', 'DESC'],
];

async function publicPlants({ category, district } = {}) {
  const nurseryWhere = { verification_status: 'approved', show_on_homepage: true };
  if (district) nurseryWhere.district = district;
  const speciesWhere = { status: 'approved' };
  if (category) speciesWhere.category = category;
  const batches = await Batch.findAll({
    where: { published_at: { [Op.ne]: null }, stage: { [Op.in]: HOMEPAGE_STAGES } },
    include: [
      { model: PlantSpecies, as: 'species', where: speciesWhere, required: true },
      // paranoid (default): an archived nursery is left out
      { model: Nursery, as: 'nursery', where: nurseryWhere, required: true },
    ],
    order: FEATURED_ORDER,
    limit: 60,
  });
  const committed = await committedForBatches(batches.map((b) => b.id));
  const today = todayKigali();
  const cards = [];
  for (const batch of batches) {
    const free = Math.max(0, batch.quantity_current - committed.get(batch.id));
    if (free > 0) cards.push(publicCard(batch, free, today));
  }
  return cards;
}

module.exports = { publishBlockReason, primeProgress, publicCard, publicPlants, FEATURED_ORDER };

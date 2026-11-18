// AvailablePlantsService: ready plants that nurseries can supply, shown to APPROVED institutions
// next to the surplus offers (docs/DEVIATIONS.md W42-W43). Request-and-approve only: no cart,
// no checkout, no payment.
//
// A batch is shown when ALL of these are true:
//   - its stage is "ready" or "overgrown"
//   - its species is approved (a batch waiting for species approval never appears)
//   - its nursery is approved and has "Show to institutions" ON for the nursery (Settings)
//   - the batch itself has "Show to institutions" ON
//   - its free quantity is above zero:
//       free = stock - plants already promised (active listings and open requests, stockService)
//
// What an institution sees: species, plant type, the FREE quantity (never the total stock), the
// nursery's name, district, sector and map pin, the price per plant if the nursery entered one, and
// the earliest pickup date. Never sales, expenses, risk level, alerts, total stock or phone number.
const { Op } = require('sequelize');
const { Batch, Nursery, PlantSpecies } = require('../models');
const { AVAILABLE_STAGES } = require('../utils/constants');
const { todayKigali } = require('../utils/dates');
const { availableQuantity } = require('./stockService');

// Is this batch shown right now? (stock aside) The batch must be loaded with species and nursery.
function isShown(batch) {
  return (
    AVAILABLE_STAGES.includes(batch.stage) &&
    batch.show_to_institutions === true &&
    batch.species?.status === 'approved' &&
    batch.nursery?.verification_status === 'approved' &&
    batch.nursery?.show_available_plants === true &&
    !batch.archived_at
  );
}

function availableJson(batch, free, today = todayKigali()) {
  const species = batch.species;
  const nursery = batch.nursery;
  return {
    id: batch.id,
    species: { id: species.id, name: species.common_name, kinyarwanda_name: species.kinyarwanda_name, category: species.category },
    available: free,
    // Shown only when the nursery entered a price (0 = no price given)
    unit_price: batch.unit_price > 0 ? batch.unit_price : null,
    // Ready batches can be collected now; a batch marked ready before its ready date, from that date
    available_from: batch.expected_ready_date && batch.expected_ready_date > today ? batch.expected_ready_date : today,
    nursery: {
      id: nursery.id,
      name: nursery.name,
      district: nursery.district,
      sector: nursery.sector,
      latitude: nursery.latitude === null ? null : Number(nursery.latitude),
      longitude: nursery.longitude === null ? null : Number(nursery.longitude),
    },
  };
}

// filters: district, category (plant type), speciesId, minQuantity
async function list({ district, category, speciesId, minQuantity } = {}) {
  const speciesWhere = { status: 'approved' };
  if (category) speciesWhere.category = category;
  if (speciesId) speciesWhere.id = speciesId;
  const nurseryWhere = { verification_status: 'approved', show_available_plants: true };
  if (district) nurseryWhere.district = district;

  const batches = await Batch.findAll({
    where: { stage: { [Op.in]: AVAILABLE_STAGES }, show_to_institutions: true },
    include: [
      { model: PlantSpecies, as: 'species', where: speciesWhere, required: true },
      { model: Nursery, as: 'nursery', where: nurseryWhere, required: true },
    ],
    order: [['planting_date', 'ASC']],
  });
  const today = todayKigali();
  const result = [];
  for (const batch of batches) {
    const free = await availableQuantity(batch);
    if (free > 0 && free >= (minQuantity || 1)) result.push(availableJson(batch, free, today));
  }
  return result;
}

module.exports = { isShown, availableJson, list };

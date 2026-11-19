// ImpactService (Figure 7, FR12): summaries of confirmed hand-overs.
// Every figure comes from IMPACT_RECORDS, which exist only after BOTH parties confirmed.
// No numbers are ever invented: with no records, every total is 0.
//
// Two kinds of hand-over are counted separately, so the numbers stay honest (docs/DEVIATIONS.md W44):
//   plants_redirected  SURPLUS redirected: from a surplus offer, or from a batch that was at risk
//   plants_supplied    plants SUPPLIED for greening from healthy stock ("Available plants");
//                      these were not saved from waste and are never counted as such
//   plants_total       both together
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const { kigaliMonth } = require('../utils/sqlDialect');

// A request is for a listing (listing_id) or straight for a batch (batch_id), so the batch and
// nursery are found through whichever is set.
const FROM = `FROM impact_records i
                JOIN surplus_requests r ON r.id = i.request_id
                LEFT JOIN surplus_listings l ON l.id = r.listing_id
                JOIN batches b ON b.id = COALESCE(l.batch_id, r.batch_id)`;

function filters({ nurseryId, institutionId }, replacements) {
  const conditions = [];
  if (nurseryId) {
    conditions.push('b.nursery_id = :nurseryId');
    replacements.nurseryId = nurseryId;
  }
  if (institutionId) {
    conditions.push('r.institution_id = :institutionId');
    replacements.institutionId = institutionId;
  }
  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

const SURPLUS = "CASE WHEN i.impact_type = 'surplus_redirected' THEN i.quantity_delivered ELSE 0 END";
const SUPPLY = "CASE WHEN i.impact_type = 'greening_supply' THEN i.quantity_delivered ELSE 0 END";

// filter: { nurseryId } or { institutionId } or {} for everything
async function summary({ nurseryId = null, institutionId = null } = {}) {
  const replacements = {};
  const where = filters({ nurseryId, institutionId }, replacements);

  const [totals] = await sequelize.query(
    `SELECT COUNT(*) AS handovers,
            COALESCE(SUM(i.quantity_delivered), 0) AS plants,
            COALESCE(SUM(${SURPLUS}), 0) AS surplus,
            COALESCE(SUM(${SUPPLY}), 0) AS supplied,
            COALESCE(SUM(i.land_cleared_sqm), 0) AS land,
            COUNT(DISTINCT CONCAT(i.district, '|', i.planting_site)) AS sites,
            COUNT(DISTINCT r.institution_id) AS institutions,
            COUNT(DISTINCT b.nursery_id) AS nurseries
       ${FROM} ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );
  const byDistrict = await sequelize.query(
    `SELECT i.district, COUNT(*) AS handovers, SUM(i.quantity_delivered) AS plants
       ${FROM} ${where} GROUP BY i.district ORDER BY plants DESC`,
    { replacements, type: QueryTypes.SELECT }
  );
  // Months are calculated in Kigali time (UTC+2)
  const monthly = await sequelize.query(
    `SELECT ${kigaliMonth('i.recorded_at')} AS month,
            SUM(i.quantity_delivered) AS plants, SUM(${SURPLUS}) AS surplus, SUM(${SUPPLY}) AS supplied, COUNT(*) AS handovers
       ${FROM} ${where} GROUP BY month ORDER BY month`,
    { replacements, type: QueryTypes.SELECT }
  );

  return {
    plants_redirected: Number(totals.surplus),
    plants_supplied: Number(totals.supplied),
    plants_total: Number(totals.plants),
    handovers: Number(totals.handovers),
    land_cleared_sqm: Number(totals.land),
    planting_sites: Number(totals.sites),
    institutions: Number(totals.institutions),
    nurseries: Number(totals.nurseries),
    by_district: byDistrict.map((d) => ({ district: d.district, plants: Number(d.plants), handovers: Number(d.handovers) })),
    monthly: monthly.map((m) => ({ month: m.month, plants: Number(m.plants), surplus: Number(m.surplus), supplied: Number(m.supplied), handovers: Number(m.handovers) })),
  };
}

// Detailed list (roles only, never public)
async function records({ nurseryId = null, institutionId = null, limit = 100 } = {}) {
  const replacements = { limit };
  const where = filters({ nurseryId, institutionId }, replacements);
  return sequelize.query(
    `SELECT i.id, i.quantity_delivered, i.planting_site, i.district, i.land_cleared_sqm, i.recorded_at, i.impact_type,
            n.name AS nursery, inst.org_name AS institution, s.common_name AS species
       ${FROM}
       JOIN nurseries n ON n.id = b.nursery_id
       JOIN institutions inst ON inst.id = r.institution_id
       JOIN plant_species s ON s.id = b.species_id
       ${where} ORDER BY i.recorded_at DESC LIMIT :limit`,
    { replacements, type: QueryTypes.SELECT }
  );
}

module.exports = { summary, records };

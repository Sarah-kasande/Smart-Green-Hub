// ImpactService (Figure 7, FR12): summaries of confirmed hand-overs.
// Every figure comes from IMPACT_RECORDS, which exist only after BOTH parties confirmed.
// No numbers are ever invented: with no records, every total is 0.
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

// filter: { nurseryId } or { institutionId } or {} for everything
async function summary({ nurseryId = null, institutionId = null } = {}) {
  const conditions = [];
  const replacements = {};
  if (nurseryId) {
    conditions.push('l.nursery_id = :nurseryId');
    replacements.nurseryId = nurseryId;
  }
  if (institutionId) {
    conditions.push('r.institution_id = :institutionId');
    replacements.institutionId = institutionId;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const from = `FROM impact_records i
                JOIN surplus_requests r ON r.id = i.request_id
                JOIN surplus_listings l ON l.id = r.listing_id`;

  const [totals] = await sequelize.query(
    `SELECT COUNT(*) AS handovers,
            COALESCE(SUM(i.quantity_delivered), 0) AS plants,
            COALESCE(SUM(i.land_cleared_sqm), 0) AS land,
            COUNT(DISTINCT CONCAT(i.district, '|', i.planting_site)) AS sites,
            COUNT(DISTINCT r.institution_id) AS institutions,
            COUNT(DISTINCT l.nursery_id) AS nurseries
       ${from} ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );
  const byDistrict = await sequelize.query(
    `SELECT i.district, COUNT(*) AS handovers, SUM(i.quantity_delivered) AS plants
       ${from} ${where} GROUP BY i.district ORDER BY plants DESC`,
    { replacements, type: QueryTypes.SELECT }
  );
  // Months are calculated in Kigali time (UTC+2)
  const monthly = await sequelize.query(
    `SELECT DATE_FORMAT(DATE_ADD(i.recorded_at, INTERVAL 2 HOUR), '%Y-%m') AS month,
            SUM(i.quantity_delivered) AS plants, COUNT(*) AS handovers
       ${from} ${where} GROUP BY month ORDER BY month`,
    { replacements, type: QueryTypes.SELECT }
  );

  return {
    plants_redirected: Number(totals.plants),
    handovers: Number(totals.handovers),
    land_cleared_sqm: Number(totals.land),
    planting_sites: Number(totals.sites),
    institutions: Number(totals.institutions),
    nurseries: Number(totals.nurseries),
    by_district: byDistrict.map((d) => ({ district: d.district, plants: Number(d.plants), handovers: Number(d.handovers) })),
    monthly: monthly.map((m) => ({ month: m.month, plants: Number(m.plants), handovers: Number(m.handovers) })),
  };
}

// Detailed list (roles only, never public)
async function records({ nurseryId = null, institutionId = null, limit = 100 } = {}) {
  const conditions = [];
  const replacements = { limit };
  if (nurseryId) {
    conditions.push('l.nursery_id = :nurseryId');
    replacements.nurseryId = nurseryId;
  }
  if (institutionId) {
    conditions.push('r.institution_id = :institutionId');
    replacements.institutionId = institutionId;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return sequelize.query(
    `SELECT i.id, i.quantity_delivered, i.planting_site, i.district, i.land_cleared_sqm, i.recorded_at,
            n.name AS nursery, inst.org_name AS institution, s.common_name AS species
       FROM impact_records i
       JOIN surplus_requests r ON r.id = i.request_id
       JOIN surplus_listings l ON l.id = r.listing_id
       JOIN nurseries n ON n.id = l.nursery_id
       JOIN institutions inst ON inst.id = r.institution_id
       JOIN batches b ON b.id = l.batch_id
       JOIN plant_species s ON s.id = b.species_id
       ${where} ORDER BY i.recorded_at DESC LIMIT :limit`,
    { replacements, type: QueryTypes.SELECT }
  );
}

module.exports = { summary, records };

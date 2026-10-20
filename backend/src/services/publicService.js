// What public visitors may see (FR03, FR12, NFR03): approved nurseries whose operators agreed to be
// listed, and aggregate impact figures. No risk information, no documents, no review notes.
const { Nursery, User } = require('../models');
const impact = require('./impactService');

async function directory({ district } = {}) {
  const where = { verification_status: 'approved', is_listed: true };
  if (district) where.district = district;
  const nurseries = await Nursery.findAll({
    where,
    include: [{ model: User, as: 'owner', attributes: ['phone'] }],
    order: [['name', 'ASC']],
  });
  return nurseries.map((n) => ({
    id: n.id,
    name: n.name,
    district: n.district,
    sector: n.sector,
    address_text: n.address_text,
    latitude: n.latitude === null ? null : Number(n.latitude),
    longitude: n.longitude === null ? null : Number(n.longitude),
    // Shared because the operator consented to publication of name, location and contact (is_listed)
    contact_phone: n.owner?.phone || null,
  }));
}

async function publicImpact() {
  const s = await impact.summary();
  // Aggregates only: no nursery or institution names
  return {
    plants_redirected: s.plants_redirected,
    handovers: s.handovers,
    land_cleared_sqm: s.land_cleared_sqm,
    planting_sites: s.planting_sites,
    by_district: s.by_district,
  };
}

module.exports = { directory, publicImpact };

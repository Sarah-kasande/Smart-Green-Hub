// Figures for the operator and institution home pages.
const { Op } = require('sequelize');
const { RiskAlert, Batch, PlantSpecies, SurplusListing, SurplusRequest } = require('../models');
const { todayKigali } = require('../utils/dates');
const inventory = require('./inventoryService');
const finance = require('./financeService');
const impact = require('./impactService');

async function operatorDashboard(nursery) {
  const batches = await inventory.listBatches(nursery);
  const today = todayKigali();
  const month = await finance.profitLoss(nursery, { from: `${today.slice(0, 7)}-01`, to: today });

  const openAlerts = await RiskAlert.findAll({
    where: { status: { [Op.in]: ['open', 'acknowledged'] } },
    include: [{ model: Batch, as: 'batch', where: { nursery_id: nursery.id }, include: [{ model: PlantSpecies, as: 'species', paranoid: false }] }],
    order: [['risk_level', 'DESC'], ['days_to_prime_end', 'ASC']],
  });
  const activeListings = await SurplusListing.count({ where: { nursery_id: nursery.id, status: { [Op.in]: ['active', 'reserved'] } } });
  const pendingRequests = await SurplusRequest.count({
    where: { status: 'pending' },
    include: [{ model: SurplusListing, as: 'listing', where: { nursery_id: nursery.id } }],
  });
  // Highest risk first: risk_level is an ENUM ordered low < medium < high, so DESC puts high first
  const levelRank = { high: 0, medium: 1, low: 2 };
  openAlerts.sort((a, b) => levelRank[a.risk_level] - levelRank[b.risk_level] || a.days_to_prime_end - b.days_to_prime_end);

  return {
    plants_in_stock: batches.reduce((n, b) => n + b.quantity_current, 0),
    active_batches: batches.length,
    open_alerts: { high: openAlerts.filter((a) => a.risk_level === 'high').length, medium: openAlerts.filter((a) => a.risk_level === 'medium').length },
    active_listings: activeListings,
    pending_requests: pendingRequests,
    month: { income: month.income, expenses: month.expenses, profit: month.profit, units_sold: month.units_sold },
    attention: openAlerts.slice(0, 6).map((a) => ({
      alert_id: a.id,
      batch_id: a.batch_id,
      species: a.batch?.species?.common_name,
      stage: a.batch?.stage,
      quantity: a.batch?.quantity_current,
      risk_level: a.risk_level,
      days_left: a.days_to_prime_end,
      suggested_action: a.suggested_action,
    })),
    ready_soon: batches.filter((b) => ['seedling', 'growing'].includes(b.stage)).slice(0, 5),
  };
}

async function institutionDashboard(institution) {
  const counts = {};
  for (const status of ['pending', 'approved', 'fulfilled', 'declined', 'cancelled']) {
    counts[status] = await SurplusRequest.count({ where: { institution_id: institution.id, status } });
  }
  return { requests: counts, impact: await impact.summary({ institutionId: institution.id }) };
}

module.exports = { operatorDashboard, institutionDashboard };

// PlanningService (Figure 7, FR08): how many plants of each species to plant next.
// The formula is in riskRules.plantingQuantity; this file gathers the inputs from the database
// and shows the basis of every suggestion.
const { Op, QueryTypes } = require('sequelize');
const { sequelize, Batch, PlantSpecies, PlantingRecommendation } = require('../models');
const HttpError = require('../utils/httpError');
const { todayKigali, addDays, kigaliDayStart } = require('../utils/dates');
const { hasEnoughHistory, plantingQuantity, HISTORY_DAYS } = require('./riskRules');
const { defaultRule } = require('./ruleService');
const audit = require('./auditService');

const PIPELINE_STAGES = ['seedling', 'growing', 'ready']; // docs/DEVIATIONS.md F3

async function salesFacts(nurseryId, speciesId, today) {
  const from = kigaliDayStart(addDays(today, -HISTORY_DAYS));
  const [row] = await sequelize.query(
    `SELECT MIN(s.sold_at) AS first_sale,
            COALESCE(SUM(CASE WHEN s.sold_at >= :from THEN s.quantity ELSE 0 END), 0) AS units_3m
       FROM sales s JOIN batches b ON b.id = s.batch_id
      WHERE s.nursery_id = :nurseryId AND b.species_id = :speciesId AND s.archived_at IS NULL`,
    { replacements: { nurseryId, speciesId, from }, type: QueryTypes.SELECT }
  );
  return {
    firstSaleDate: row.first_sale ? todayKigali(new Date(row.first_sale)) : null,
    unitsLast3Months: Number(row.units_3m),
  };
}

async function pipelineFor(nurseryId, speciesId) {
  return (await Batch.sum('quantity_current', { where: { nursery_id: nurseryId, species_id: speciesId, stage: { [Op.in]: PIPELINE_STAGES } } })) || 0;
}

// Recommendation for one species. `quantity` is null when there is not enough sales history;
// `basis` holds every number used, so the screen can explain the suggestion.
async function recommendFor(nursery, species, { today = todayKigali(), settings } = {}) {
  const rule = settings || (await defaultRule());
  const facts = await salesFacts(nursery.id, species.id, today);
  const pipeline = await pipelineFor(nursery.id, species.id);
  const basis = {
    units_last_3_months: facts.unitsLast3Months,
    first_sale_date: facts.firstSaleDate,
    days_to_ready: species.default_days_to_ready,
    safety_margin: rule.safety_margin,
    pipeline,
  };
  if (!hasEnoughHistory({ ...facts, today })) {
    return { species_id: species.id, species: species.common_name, quantity: null, enough_history: false, basis };
  }
  const calc = plantingQuantity({
    unitsLast3Months: facts.unitsLast3Months,
    daysToReady: species.default_days_to_ready,
    safetyMargin: rule.safety_margin,
    pipeline,
  });
  return {
    species_id: species.id,
    species: species.common_name,
    quantity: calc.quantity,
    enough_history: true,
    basis: { ...basis, average_monthly: Number(calc.averageMonthly.toFixed(2)), cycle_months: Number(calc.cycleMonths.toFixed(2)) },
  };
}

// Species worth showing: ones this nursery has sold or currently grows.
async function relevantSpecies(nursery) {
  const [rows] = await sequelize.query(
    `SELECT DISTINCT species_id FROM batches WHERE nursery_id = :id AND archived_at IS NULL`,
    { replacements: { id: nursery.id } }
  );
  const ids = rows.map((r) => r.species_id);
  if (!ids.length) return [];
  return PlantSpecies.findAll({ where: { id: { [Op.in]: ids } }, paranoid: false, order: [['common_name', 'ASC']] });
}

async function listRecommendations(nursery, { today = todayKigali() } = {}) {
  const settings = await defaultRule();
  const result = [];
  for (const species of await relevantSpecies(nursery)) {
    const rec = await recommendFor(nursery, species, { today, settings });
    const last = await PlantingRecommendation.findOne({
      where: { nursery_id: nursery.id, species_id: species.id },
      order: [['generated_at', 'DESC']],
    });
    result.push({ ...rec, last_decision: last ? { status: last.status, quantity: last.recommended_qty, at: last.generated_at } : null });
  }
  return result;
}

// The operator accepts or dismisses a suggestion; the numbers at that moment are saved.
async function saveDecision(nursery, user, speciesId, status) {
  const species = await PlantSpecies.findByPk(speciesId, { paranoid: false });
  if (!species) throw new HttpError(404, 'NOT_FOUND', 'Species not found');
  const rec = await recommendFor(nursery, species);
  const row = await PlantingRecommendation.create({
    nursery_id: nursery.id,
    species_id: species.id,
    recommended_qty: rec.quantity,
    basis_text: JSON.stringify(rec.basis),
    status,
    generated_at: new Date(),
  });
  await audit.log({ actorId: user.id, action: `planting.${status}`, entityType: 'planting_recommendation', entityId: row.id });
  return row;
}

module.exports = { recommendFor, listRecommendations, saveDecision, PIPELINE_STAGES };

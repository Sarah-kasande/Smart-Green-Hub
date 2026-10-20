// The surplus-risk rules from Table 5 / Figure 9, as plain functions with no database access,
// so every rule can be unit-tested and explained line by line. No machine learning.
//
//   Sales rate      r = units of the species sold by this nursery in the last L days / L
//   Days left       D = prime-window end date - today   (0 if the date has passed)
//   Projected unsold U = max(0, S - r x D)              (S = current stock of the batch)
//   Risk ratio      R = U / S
//   Level           High if (D = 0 and S > 0) or R >= high ratio (0.50)
//                   Medium if medium ratio (0.20) <= R < high ratio
//                   otherwise Low
//   Action          D <= near days (7) or stage overgrown -> post to Surplus Board or donate
//                   D > far days (28)                     -> reduce next planting or discount
//                   otherwise (8 to 28 days)              -> discount or transplant
const { daysBetween } = require('../utils/dates');

function salesRate(unitsSold, lookbackDays) {
  if (!lookbackDays || lookbackDays <= 0) return 0;
  return unitsSold / lookbackDays;
}

function daysLeft(primeEndDate, today) {
  return Math.max(0, daysBetween(today, primeEndDate));
}

function projectedUnsold(stock, rate, days) {
  return Math.max(0, stock - rate * days);
}

// A batch with no stock has nothing left to become surplus, so its ratio is 0 (avoids dividing by 0).
function riskRatio(unsold, stock) {
  return stock > 0 ? unsold / stock : 0;
}

function riskLevel({ stock, days, ratio, mediumRatio, highRatio }) {
  if (stock <= 0) return 'low';
  if (days === 0) return 'high'; // past (or at) the end of the prime window with plants left
  if (ratio >= highRatio) return 'high';
  if (ratio >= mediumRatio) return 'medium';
  return 'low';
}

function suggestedAction({ days, stage, farDays, nearDays }) {
  if (stage === 'overgrown' || days <= nearDays) return 'surplus_board_or_donate';
  if (days > farDays) return 'reduce_or_discount';
  return 'discount_or_transplant';
}

// Runs all rules for one batch.
//   settings: { sales_lookback_days, medium_risk_ratio, high_risk_ratio, far_days, near_days }
function evaluateBatch({ stock, unitsSold, primeEndDate, today, stage, settings }) {
  const lookback = Number(settings.sales_lookback_days);
  const r = salesRate(unitsSold, lookback);
  const D = daysLeft(primeEndDate, today);
  const U = projectedUnsold(stock, r, D);
  const R = riskRatio(U, stock);
  return {
    sales_rate: r,
    days_left: D,
    projected_unsold: Math.ceil(U), // whole plants; rounded up so a remaining fraction is not hidden
    risk_ratio: R,
    level: riskLevel({ stock, days: D, ratio: R, mediumRatio: Number(settings.medium_risk_ratio), highRatio: Number(settings.high_risk_ratio) }),
    action: suggestedAction({ days: D, stage, farDays: Number(settings.far_days), nearDays: Number(settings.near_days) }),
  };
}

// Planting recommendation (Table 5 / FR08):
//   average monthly units sold (last 3 months) x growing-cycle months x (1 + safety margin)
//   - plants already in the pipeline, never below zero.
// Returns null when there is not enough sales history (docs/DEVIATIONS.md F4):
//   fewer than 90 days since the first sale of the species, or no sales in the last 3 months.
const HISTORY_DAYS = 90;

function hasEnoughHistory({ firstSaleDate, unitsLast3Months, today }) {
  if (!firstSaleDate) return false;
  if (unitsLast3Months <= 0) return false;
  return daysBetween(firstSaleDate, today) >= HISTORY_DAYS;
}

function plantingQuantity({ unitsLast3Months, daysToReady, safetyMargin, pipeline }) {
  const averageMonthly = unitsLast3Months / 3;
  const cycleMonths = daysToReady / 30;
  const raw = averageMonthly * cycleMonths * (1 + Number(safetyMargin)) - pipeline;
  return { averageMonthly, cycleMonths, raw, quantity: Math.max(0, Math.ceil(raw)) };
}

module.exports = {
  salesRate,
  daysLeft,
  projectedUnsold,
  riskRatio,
  riskLevel,
  suggestedAction,
  evaluateBatch,
  HISTORY_DAYS,
  hasEnoughHistory,
  plantingQuantity,
};

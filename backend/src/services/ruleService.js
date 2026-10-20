// Reads RULE_SETTINGS. The row with species_id = NULL is the default rule; a species row
// overrides only its prime-window length (docs/DEVIATIONS.md D8).
const { RuleSetting } = require('../models');

const FALLBACK = {
  sales_lookback_days: 28,
  medium_risk_ratio: 0.2,
  high_risk_ratio: 0.5,
  safety_margin: 0.1,
  far_days: 28,
  near_days: 7,
};

async function defaultRule(transaction) {
  const row = await RuleSetting.findOne({ where: { species_id: null }, transaction });
  if (!row) return { ...FALLBACK };
  return {
    id: row.id,
    sales_lookback_days: row.sales_lookback_days,
    medium_risk_ratio: Number(row.medium_risk_ratio),
    high_risk_ratio: Number(row.high_risk_ratio),
    safety_margin: Number(row.safety_margin),
    far_days: row.far_days,
    near_days: row.near_days,
    updated_at: row.updated_at,
  };
}

module.exports = { defaultRule, FALLBACK };

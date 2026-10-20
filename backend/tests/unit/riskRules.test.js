// Unit tests for every Table 5 rule, its boundaries and edge cases (FR06, FR07, FR08).
const r = require('../../src/services/riskRules');

const SETTINGS = { sales_lookback_days: 28, medium_risk_ratio: 0.2, high_risk_ratio: 0.5, far_days: 28, near_days: 7 };
const TODAY = '2026-10-20';

describe('sales rate r = units sold in L / L', () => {
  test('56 units in 28 days -> 2 per day', () => expect(r.salesRate(56, 28)).toBe(2));
  test('no sales -> 0', () => expect(r.salesRate(0, 28)).toBe(0));
  test('a lookback of 0 days never divides by zero', () => expect(r.salesRate(10, 0)).toBe(0));
});

describe('days left D = prime end - today (0 if passed)', () => {
  test('10 days ahead', () => expect(r.daysLeft('2026-10-30', TODAY)).toBe(10));
  test('ends today -> 0', () => expect(r.daysLeft(TODAY, TODAY)).toBe(0));
  test('already passed -> 0, never negative', () => expect(r.daysLeft('2026-09-01', TODAY)).toBe(0));
});

describe('projected unsold U = max(0, S - r x D)', () => {
  test('100 - 2 x 10 = 80', () => expect(r.projectedUnsold(100, 2, 10)).toBe(80));
  test('never below zero', () => expect(r.projectedUnsold(10, 2, 10)).toBe(0));
});

describe('risk ratio R = U / S', () => {
  test('80 / 100 = 0.8', () => expect(r.riskRatio(80, 100)).toBe(0.8));
  test('no stock -> 0 (no division by zero)', () => expect(r.riskRatio(0, 0)).toBe(0));
});

describe('risk level', () => {
  const level = (stock, days, ratio) => r.riskLevel({ stock, days, ratio, mediumRatio: 0.2, highRatio: 0.5 });
  test('D = 0 and S > 0 -> High, even with a low ratio', () => expect(level(5, 0, 0)).toBe('high'));
  test('S = 0 -> Low, even when the prime window has ended', () => expect(level(0, 0, 0)).toBe('low'));
  test('R = 0.50 exactly -> High (boundary)', () => expect(level(100, 10, 0.5)).toBe('high'));
  test('R = 0.4999 -> Medium', () => expect(level(100, 10, 0.4999)).toBe('medium'));
  test('R = 0.20 exactly -> Medium (boundary)', () => expect(level(100, 10, 0.2)).toBe('medium'));
  test('R = 0.1999 -> Low', () => expect(level(100, 10, 0.1999)).toBe('low'));
  test('custom thresholds from RULE_SETTINGS are used', () => {
    expect(r.riskLevel({ stock: 100, days: 10, ratio: 0.3, mediumRatio: 0.35, highRatio: 0.7 })).toBe('low');
  });
});

describe('suggested action by days left', () => {
  const action = (days, stage = 'ready') => r.suggestedAction({ days, stage, farDays: 28, nearDays: 7 });
  test('D = 29 (> 28) -> reduce next planting or discount', () => expect(action(29)).toBe('reduce_or_discount'));
  test('D = 28 -> discount or transplant (boundary)', () => expect(action(28)).toBe('discount_or_transplant'));
  test('D = 8 -> discount or transplant (boundary)', () => expect(action(8)).toBe('discount_or_transplant'));
  test('D = 7 -> Surplus Board or donate (boundary)', () => expect(action(7)).toBe('surplus_board_or_donate'));
  test('D = 0 -> Surplus Board or donate', () => expect(action(0)).toBe('surplus_board_or_donate'));
  test('overgrown batch -> Surplus Board or donate, whatever D is', () => expect(action(40, 'overgrown')).toBe('surplus_board_or_donate'));
});

describe('evaluateBatch: worked examples', () => {
  test('High: 200 plants, 2 sold per day, 30 days left -> U = 140, R = 0.70', () => {
    const result = r.evaluateBatch({ stock: 200, unitsSold: 56, primeEndDate: '2026-11-19', today: TODAY, stage: 'ready', settings: SETTINGS });
    expect(result).toMatchObject({ sales_rate: 2, days_left: 30, projected_unsold: 140, level: 'high', action: 'reduce_or_discount' });
    expect(result.risk_ratio).toBeCloseTo(0.7);
  });
  test('Medium: 100 plants, 3 per day, 25 days left -> U = 25, R = 0.25', () => {
    const result = r.evaluateBatch({ stock: 100, unitsSold: 84, primeEndDate: '2026-11-14', today: TODAY, stage: 'ready', settings: SETTINGS });
    expect(result).toMatchObject({ days_left: 25, projected_unsold: 25, level: 'medium', action: 'discount_or_transplant' });
  });
  test('Low: sales will clear the batch in time', () => {
    const result = r.evaluateBatch({ stock: 100, unitsSold: 140, primeEndDate: '2026-11-14', today: TODAY, stage: 'ready', settings: SETTINGS });
    expect(result).toMatchObject({ projected_unsold: 0, risk_ratio: 0, level: 'low' });
  });
  test('No sales at all and 5 days left -> High, post to the Surplus Board', () => {
    const result = r.evaluateBatch({ stock: 50, unitsSold: 0, primeEndDate: '2026-10-25', today: TODAY, stage: 'ready', settings: SETTINGS });
    expect(result).toMatchObject({ projected_unsold: 50, risk_ratio: 1, level: 'high', action: 'surplus_board_or_donate' });
  });
  test('Past the prime window with plants left -> High', () => {
    const result = r.evaluateBatch({ stock: 3, unitsSold: 1000, primeEndDate: '2026-09-01', today: TODAY, stage: 'overgrown', settings: SETTINGS });
    expect(result).toMatchObject({ days_left: 0, level: 'high', action: 'surplus_board_or_donate' });
  });
  test('A fraction of a plant is rounded up', () => {
    const result = r.evaluateBatch({ stock: 10, unitsSold: 1, primeEndDate: '2026-10-21', today: TODAY, stage: 'ready', settings: { ...SETTINGS, sales_lookback_days: 3 } });
    expect(result.projected_unsold).toBe(10); // 10 - (1/3 x 1) = 9.67 -> 10
  });
  test('Settings stored as text (DECIMAL from MySQL) still work', () => {
    const result = r.evaluateBatch({ stock: 100, unitsSold: 84, primeEndDate: '2026-11-14', today: TODAY, stage: 'ready', settings: { ...SETTINGS, medium_risk_ratio: '0.20', high_risk_ratio: '0.50' } });
    expect(result.level).toBe('medium');
  });
});

describe('planting recommendation', () => {
  test('enough history: first sale 90+ days ago and sales in the last 3 months', () => {
    expect(r.hasEnoughHistory({ firstSaleDate: '2026-07-22', unitsLast3Months: 10, today: TODAY })).toBe(true); // exactly 90 days
  });
  test('not enough: first sale only 89 days ago', () => {
    expect(r.hasEnoughHistory({ firstSaleDate: '2026-07-23', unitsLast3Months: 10, today: TODAY })).toBe(false);
  });
  test('not enough: never sold', () => expect(r.hasEnoughHistory({ firstSaleDate: null, unitsLast3Months: 0, today: TODAY })).toBe(false));
  test('not enough: no sales in the last 3 months', () => {
    expect(r.hasEnoughHistory({ firstSaleDate: '2025-01-01', unitsLast3Months: 0, today: TODAY })).toBe(false);
  });
  test('90 sold in 3 months, 120-day cycle, 10% margin, 32 in pipeline -> 100', () => {
    // 30 per month x 4 months x 1.10 = 132, minus 32 already growing = 100
    expect(r.plantingQuantity({ unitsLast3Months: 90, daysToReady: 120, safetyMargin: 0.1, pipeline: 32 }).quantity).toBe(100);
  });
  test('never below zero when the pipeline is already large', () => {
    expect(r.plantingQuantity({ unitsLast3Months: 90, daysToReady: 120, safetyMargin: 0.1, pipeline: 500 }).quantity).toBe(0);
  });
  test('a fraction is rounded up to a whole plant', () => {
    // 10/3 x 1 x 1.1 = 3.67 -> 4
    expect(r.plantingQuantity({ unitsLast3Months: 10, daysToReady: 30, safetyMargin: 0.1, pipeline: 0 }).quantity).toBe(4);
  });
});

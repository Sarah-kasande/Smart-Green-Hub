// RiskEngineService (Figure 7, FR06, FR07): runs the Table 5 rules on every active batch,
// nightly and on demand, and keeps ONE open alert per Medium/High batch.
// It never changes a batch, a price or a listing; the operator decides (FR07).
const { Op, QueryTypes } = require('sequelize');
const { sequelize, Batch, PlantSpecies, Nursery, RiskAlert } = require('../models');
const HttpError = require('../utils/httpError');
const { todayKigali, addDays, kigaliDayStart } = require('../utils/dates');
const { evaluateBatch, SELLABLE_STAGES } = require('./riskRules');
const { defaultRule } = require('./ruleService');
const audit = require('./auditService');
const { notify, dispatchSoon } = require('./notificationService');

const ACTIVE_STAGES = ['seedling', 'growing', 'ready', 'overgrown'];
// After the operator dismisses an alert, the same batch is not alerted again at the same or a
// lower level for this many days (avoids a new alert every night; docs/DEVIATIONS.md F8).
const DISMISS_QUIET_DAYS = 7;

// Units of one species sold by one nursery in the last `lookback` days (today included).
// The species rate is then shared between the batches of that species (riskRules.batchSalesRate,
// docs/DEVIATIONS.md W53), so two batches no longer each count on the full rate.
async function unitsSold(nurseryId, speciesId, lookback, today) {
  const from = kigaliDayStart(addDays(today, -(lookback - 1)));
  const to = kigaliDayStart(addDays(today, 1));
  const [row] = await sequelize.query(
    `SELECT COALESCE(SUM(s.quantity), 0) AS units
       FROM sales s JOIN batches b ON b.id = s.batch_id
      WHERE s.nursery_id = :nurseryId AND b.species_id = :speciesId
        AND s.sold_at >= :from AND s.sold_at < :to AND s.archived_at IS NULL`,
    { replacements: { nurseryId, speciesId, from, to }, type: QueryTypes.SELECT }
  );
  return Number(row.units);
}

const LEVEL_ORDER = { low: 0, medium: 1, high: 2 };

// Evaluates all active batches (optionally of one nursery). Returns a summary.
// Batches whose species waits for the administrator's approval (or was rejected) have no
// prime-window dates yet, so they are left out until the species is approved (docs/DEVIATIONS.md W39).
async function runEvaluation({ nurseryId = null, today = todayKigali(), actorId = null } = {}) {
  const settings = await defaultRule();
  const where = { stage: { [Op.in]: ACTIVE_STAGES }, prime_end_date: { [Op.ne]: null } };
  if (nurseryId) where.nursery_id = nurseryId;
  const batches = await Batch.findAll({
    where,
    include: [
      { model: PlantSpecies, as: 'species', paranoid: false, where: { status: 'approved' }, required: true },
      { model: Nursery, as: 'nursery', where: { verification_status: 'approved' } },
    ],
  });

  const summary = { evaluated: 0, low: 0, medium: 0, high: 0, created: 0, updated: 0, quiet: 0 };
  const rateCache = {};
  // Stock that can be sold now, per nursery and species: the batches that share the species' buyers
  const sellableStock = {};
  for (const b of batches) {
    if (!SELLABLE_STAGES.includes(b.stage)) continue;
    const key = `${b.nursery_id}:${b.species_id}`;
    sellableStock[key] = (sellableStock[key] || 0) + Math.max(0, b.quantity_current);
  }

  for (const batch of batches) {
    const key = `${batch.nursery_id}:${batch.species_id}`;
    if (rateCache[key] === undefined) rateCache[key] = await unitsSold(batch.nursery_id, batch.species_id, settings.sales_lookback_days, today);

    const stock = batch.quantity_current;
    const othersSellable = (sellableStock[key] || 0) - (SELLABLE_STAGES.includes(batch.stage) ? Math.max(0, stock) : 0);
    const result = evaluateBatch({
      stock,
      unitsSold: rateCache[key],
      primeEndDate: batch.prime_end_date,
      readyDate: batch.expected_ready_date,
      pooledStock: Math.max(0, stock) + othersSellable,
      today,
      stage: batch.stage,
      settings,
    });
    summary.evaluated++;
    summary[result.level]++;
    if (result.level === 'low') continue; // Low: no alert, re-check tomorrow (Figure 9)

    const fields = {
      risk_level: result.level,
      projected_unsold: result.projected_unsold,
      days_to_prime_end: result.days_left,
      sales_rate: result.sales_rate.toFixed(4),
      risk_ratio: result.risk_ratio.toFixed(4),
      suggested_action: result.action,
      generated_at: new Date(),
    };

    await sequelize.transaction(async (transaction) => {
      // One open alert per batch: refresh the existing one instead of creating another
      const existing = await RiskAlert.findOne({
        where: { batch_id: batch.id, status: { [Op.in]: ['open', 'acknowledged'] } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existing) {
        await existing.update(fields, { transaction });
        summary.updated++;
        return;
      }

      const recentlyDismissed = await RiskAlert.findOne({
        where: {
          batch_id: batch.id,
          status: 'dismissed',
          resolved_at: { [Op.gte]: new Date(Date.now() - DISMISS_QUIET_DAYS * 24 * 60 * 60 * 1000) },
        },
        order: [['resolved_at', 'DESC']],
        transaction,
      });
      if (recentlyDismissed && LEVEL_ORDER[result.level] <= LEVEL_ORDER[recentlyDismissed.risk_level]) {
        summary.quiet++;
        return;
      }

      const alert = await RiskAlert.create({ batch_id: batch.id, status: 'open', ...fields }, { transaction });
      await audit.log({ actorId, action: 'alert.created', entityType: 'risk_alert', entityId: alert.id, reason: `${result.level} risk` }, { transaction });
      await notify(
        {
          userId: batch.nursery.owner_id,
          type: 'alert_created',
          eventKey: `alert:${alert.id}`,
          payload: {
            alert_id: alert.id,
            batch_id: batch.id,
            species: batch.species?.common_name,
            level: result.level,
            action: result.action,
            days_left: result.days_left,
            projected_unsold: result.projected_unsold,
          },
        },
        { transaction }
      );
      summary.created++;
    });
  }
  if (summary.created) dispatchSoon();
  return summary;
}

async function listAlerts(nursery, { status } = {}) {
  const where = {};
  if (status && status !== 'all') where.status = status;
  return RiskAlert.findAll({
    where,
    include: [
      {
        model: Batch,
        as: 'batch',
        where: { nursery_id: nursery.id },
        paranoid: false,
        include: [{ model: PlantSpecies, as: 'species', paranoid: false }],
      },
    ],
    order: [['generated_at', 'DESC']],
  });
}

// Allowed status changes (FR07): open -> acknowledged / resolved / dismissed,
// acknowledged -> resolved / dismissed. Resolved and dismissed are final.
const TRANSITIONS = { open: ['acknowledged', 'resolved', 'dismissed'], acknowledged: ['resolved', 'dismissed'] };

async function changeAlertStatus(nursery, user, alertId, status, note) {
  return sequelize.transaction(async (transaction) => {
    const alert = await RiskAlert.findOne({
      where: { id: alertId },
      include: [{ model: Batch, as: 'batch', where: { nursery_id: nursery.id }, paranoid: false }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!alert) throw new HttpError(404, 'NOT_FOUND', 'Alert not found');
    if (!(TRANSITIONS[alert.status] || []).includes(status)) {
      throw new HttpError(409, 'INVALID_STATUS_CHANGE', `An alert that is ${alert.status} cannot become ${status}`);
    }
    const changes = { status };
    if (status === 'resolved' || status === 'dismissed') changes.resolved_at = new Date();
    await alert.update(changes, { transaction });
    await audit.log({ actorId: user.id, action: `alert.${status}`, entityType: 'risk_alert', entityId: alert.id, reason: note || null }, { transaction });
    return alert;
  });
}

module.exports = { runEvaluation, listAlerts, changeAlertStatus, unitsSold, DISMISS_QUIET_DAYS };

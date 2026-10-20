// Administrator features (FR15, FR16): dashboard figures, rules and species, audit log,
// listing moderation list and failed notifications.
const { Op, QueryTypes } = require('sequelize');
const {
  sequelize,
  User,
  Nursery,
  Institution,
  Batch,
  PlantSpecies,
  RiskAlert,
  RuleSetting,
  SurplusListing,
  SurplusRequest,
  AuditLog,
  Notification,
} = require('../models');
const HttpError = require('../utils/httpError');
const audit = require('./auditService');
const impact = require('./impactService');
const { defaultRule } = require('./ruleService');
const { listingJson, listingInclude } = require('./surplusService');

// Counts rows grouped by one column, e.g. { pending: 2, approved: 5 }
async function countBy(Model, field, where = {}) {
  const rows = await Model.findAll({ where, attributes: [field, [sequelize.fn('COUNT', sequelize.col('id')), 'n']], group: [field], raw: true });
  return Object.fromEntries(rows.map((r) => [r[field], Number(r.n)]));
}

async function dashboard() {
  return {
    nurseries: await countBy(Nursery, 'verification_status'),
    institutions: await countBy(Institution, 'verification_status'),
    active_batches: await Batch.count({ where: { stage: { [Op.ne]: 'cleared' } } }),
    open_alerts: await countBy(RiskAlert, 'risk_level', { status: { [Op.in]: ['open', 'acknowledged'] } }),
    listings: await countBy(SurplusListing, 'status'),
    requests: await countBy(SurplusRequest, 'status'),
    failed_notifications: await Notification.count({ where: { status: 'failed' } }),
    impact: await impact.summary(),
  };
}

// ---- Rules (Table 5 thresholds) ----

async function getRules() {
  return defaultRule();
}

async function updateRules(admin, data) {
  if (Number(data.medium_risk_ratio) >= Number(data.high_risk_ratio)) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Medium must be lower than High', { fields: { medium_risk_ratio: 'must_be_below_high' } });
  }
  if (Number(data.near_days) >= Number(data.far_days)) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Near days must be lower than far days', { fields: { near_days: 'must_be_below_far' } });
  }
  await sequelize.transaction(async (transaction) => {
    let row = await RuleSetting.findOne({ where: { species_id: null }, transaction, lock: transaction.LOCK.UPDATE });
    if (!row) row = RuleSetting.build({ species_id: null });
    const before = await defaultRule(transaction);
    const fields = ['sales_lookback_days', 'medium_risk_ratio', 'high_risk_ratio', 'safety_margin', 'far_days', 'near_days'];
    for (const f of fields) row[f] = data[f];
    row.updated_by = admin.id;
    await row.save({ transaction });
    // The audit reason lists what changed, e.g. "high_risk_ratio 0.5 -> 0.6"
    const changes = fields.filter((f) => Number(before[f]) !== Number(data[f])).map((f) => `${f} ${before[f]} -> ${data[f]}`);
    await audit.log({ actorId: admin.id, action: 'rules.updated', entityType: 'rule_settings', entityId: row.id, reason: changes.join('; ').slice(0, 500) || 'no change' }, { transaction });
  });
  return defaultRule();
}

// ---- Species ----

async function listSpecies({ includeArchived = false } = {}) {
  const species = await PlantSpecies.findAll({ paranoid: !includeArchived, order: [['common_name', 'ASC']] });
  const overrides = await RuleSetting.findAll({ where: { species_id: { [Op.ne]: null } } });
  const bySpecies = Object.fromEntries(overrides.map((o) => [o.species_id, o.prime_window_days]));
  return species.map((s) => ({ ...s.toJSON(), prime_window_override: bySpecies[s.id] ?? null }));
}

async function saveSpecies(admin, data, id = null) {
  return sequelize.transaction(async (transaction) => {
    const fields = {
      common_name: data.common_name.trim(),
      kinyarwanda_name: data.kinyarwanda_name?.trim() || null,
      category: data.category,
      default_days_to_ready: data.default_days_to_ready,
      default_prime_days: data.default_prime_days,
    };
    let species;
    if (id) {
      species = await PlantSpecies.findByPk(id, { transaction });
      if (!species) throw new HttpError(404, 'NOT_FOUND', 'Species not found');
      await species.update(fields, { transaction });
    } else {
      species = await PlantSpecies.create(fields, { transaction });
    }
    // Optional species override of the prime window (a RULE_SETTINGS row for the species)
    const override = data.prime_window_override === '' || data.prime_window_override === undefined ? null : data.prime_window_override;
    const rule = await RuleSetting.findOne({ where: { species_id: species.id }, transaction });
    if (override === null && rule) await rule.destroy({ transaction });
    if (override !== null) {
      if (rule) await rule.update({ prime_window_days: override, updated_by: admin.id }, { transaction });
      else {
        const base = await defaultRule(transaction);
        await RuleSetting.create(
          { species_id: species.id, prime_window_days: override, sales_lookback_days: base.sales_lookback_days, medium_risk_ratio: base.medium_risk_ratio, high_risk_ratio: base.high_risk_ratio, safety_margin: base.safety_margin, far_days: base.far_days, near_days: base.near_days, updated_by: admin.id },
          { transaction }
        );
      }
    }
    await audit.log({ actorId: admin.id, action: id ? 'species.updated' : 'species.created', entityType: 'plant_species', entityId: species.id }, { transaction });
    return species;
  });
}

async function archiveSpecies(admin, id, reason) {
  const species = await PlantSpecies.findByPk(id);
  if (!species) throw new HttpError(404, 'NOT_FOUND', 'Species not found');
  await species.destroy();
  await audit.log({ actorId: admin.id, action: 'species.archived', entityType: 'plant_species', entityId: id, reason });
}

async function restoreSpecies(admin, id) {
  const species = await PlantSpecies.findByPk(id, { paranoid: false });
  if (!species) throw new HttpError(404, 'NOT_FOUND', 'Species not found');
  await species.restore();
  await audit.log({ actorId: admin.id, action: 'species.restored', entityType: 'plant_species', entityId: id });
}

// ---- Audit log (FR16) ----

async function auditLog({ entityType, action, actorId, from, to, page = 1, pageSize = 50 }) {
  const where = {};
  if (entityType) where.entity_type = entityType;
  if (action) where.action = { [Op.like]: `${action}%` };
  if (actorId) where.actor_id = actorId;
  if (from || to) {
    where.created_at = {};
    if (from) where.created_at[Op.gte] = new Date(`${from}T00:00:00+02:00`);
    if (to) where.created_at[Op.lt] = new Date(new Date(`${to}T00:00:00+02:00`).getTime() + 86400000);
  }
  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [{ model: User, as: 'actor', attributes: ['id', 'full_name', 'role'], paranoid: false }],
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const entityTypes = await sequelize.query('SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type', { type: QueryTypes.SELECT });
  return { items: rows, total: count, page, page_size: pageSize, entity_types: entityTypes.map((e) => e.entity_type) };
}

// ---- Listing moderation (FR15) ----

async function listListings({ status } = {}) {
  const where = {};
  if (status && status !== 'all') where.status = status;
  const listings = await SurplusListing.findAll({ where, include: listingInclude, order: [['created_at', 'DESC']], limit: 200 });
  const result = [];
  for (const listing of listings) result.push(await listingJson(listing));
  return result;
}

// ---- Notification failures (FR14: failures visible for follow-up) ----

async function failedNotifications() {
  return Notification.findAll({
    where: { status: 'failed' },
    include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'role'] }],
    order: [['updated_at', 'DESC']],
    limit: 100,
  });
}

async function retryNotification(admin, id) {
  const row = await Notification.findByPk(id);
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Not found');
  await row.update({ status: 'pending', attempts: 0, last_error: null });
  await audit.log({ actorId: admin.id, action: 'notification.retried', entityType: 'notification', entityId: id });
}

module.exports = {
  dashboard,
  getRules,
  updateRules,
  listSpecies,
  saveSpecies,
  archiveSpecies,
  restoreSpecies,
  auditLog,
  listListings,
  failedNotifications,
  retryNotification,
};

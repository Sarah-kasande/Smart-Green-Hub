// SyncService (Figure 7 and Figure 12): applies changes recorded offline on a phone.
//
// The phone sends its waiting changes in the order they were made:
//   { changes: [ { client_uuid, type: 'batch' | 'sale' | 'expense' | 'stock_adjustment', data } ] }
//
// For each change:
//   - its client_uuid was already applied before   -> "skipped" (a repeated upload is harmless)
//   - it is valid                                   -> "applied"
//   - the server refuses it (e.g. the sale is larger than the stock left, because another
//     phone sold the same plants meanwhile)          -> "conflict" with a reason code.
//     The server record wins; the operator sees the conflict and decides what to do.
// One change failing never stops the others.
//
// The answer also contains "server_changes": the current batches and species, so the phone's
// offline copy is up to date.
const { PlantSpecies } = require('../models');
const HttpError = require('../utils/httpError');
const inventory = require('./inventoryService');
const finance = require('./financeService');
const { BATCH_STAGES } = require('../utils/constants');

const { EXPENSE_CATEGORIES } = finance;

// ---- Validation of offline changes ----
// The online routes validate every field with express-validator. Offline changes arrive in one
// request, so each one is checked here with the same rules before it reaches a service.
const isInt = (v, min, max) => Number.isInteger(Number(v)) && String(v).trim() !== '' && Number(v) >= min && Number(v) <= max;
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isText = (v, max) => typeof v === 'string' && v.length <= max;
const optional = (v, check) => v === undefined || v === null || v === '' || check(v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RULES = {
  batch: (d) =>
    isInt(d.species_id, 1, 2147483647) &&
    isInt(d.quantity, 1, 10000000) &&
    isDate(d.planting_date) &&
    optional(d.unit_price, (v) => isInt(v, 0, 1000000000)) &&
    optional(d.days_to_ready, (v) => isInt(v, 1, 3650)) &&
    optional(d.prime_days, (v) => isInt(v, 1, 3650)) &&
    optional(d.stage, (v) => BATCH_STAGES.includes(v)),
  sale: (d) =>
    (isInt(d.batch_id, 1, 2147483647) || UUID.test(String(d.batch_client_uuid || ''))) &&
    isInt(d.quantity, 1, 10000000) &&
    optional(d.unit_price, (v) => isInt(v, 0, 1000000000)) &&
    optional(d.sold_at, (v) => !Number.isNaN(Date.parse(v))) &&
    optional(d.customer_note, (v) => isText(v, 255)),
  expense: (d) =>
    EXPENSE_CATEGORIES.includes(d.category) &&
    isInt(d.amount, 1, 1000000000) &&
    optional(d.spent_at, isDate) &&
    optional(d.note, (v) => isText(v, 255)),
  stock_adjustment: (d) =>
    isInt(d.batch_id, 1, 2147483647) &&
    isInt(d.quantity_change, -10000000, 10000000) &&
    Number(d.quantity_change) !== 0 &&
    typeof d.reason === 'string' &&
    d.reason.trim().length > 0 &&
    d.reason.length <= 255,
};

// Numbers may arrive as text from a form; store them as numbers
function normalise(data) {
  const out = { ...data };
  for (const key of ['species_id', 'quantity', 'unit_price', 'days_to_ready', 'prime_days', 'batch_id', 'amount', 'quantity_change']) {
    if (out[key] !== undefined && out[key] !== null && out[key] !== '') out[key] = Number(out[key]);
    else delete out[key];
  }
  if (typeof out.reason === 'string') out.reason = out.reason.trim();
  return out;
}

const APPLY = {
  batch: (nursery, user, data) => inventory.createBatch(nursery, user, data),
  sale: (nursery, user, data) => finance.recordSale(nursery, user, data),
  expense: (nursery, user, data) => finance.recordExpense(nursery, user, data),
  stock_adjustment: (nursery, user, data) => inventory.adjustStock(nursery, user, data),
};

async function applyChanges(nursery, user, changes) {
  const applied = [];
  const skipped = [];
  const conflicts = [];

  for (const change of changes) {
    const handler = APPLY[change.type];
    if (!handler) {
      conflicts.push({ client_uuid: change.client_uuid, code: 'UNKNOWN_TYPE' });
      continue;
    }
    if (!RULES[change.type](change.data || {})) {
      conflicts.push({ client_uuid: change.client_uuid, code: 'VALIDATION_FAILED' });
      continue;
    }
    try {
      // The client_uuid of the change is the client_uuid of the record it creates
      const result = await handler(nursery, user, { ...normalise(change.data), client_uuid: change.client_uuid });
      (result.duplicate ? skipped : applied).push(change.client_uuid);
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      conflicts.push({ client_uuid: change.client_uuid, code: error.code, details: error.details || null });
    }
  }

  return { applied, skipped, conflicts, server_changes: await serverChanges(nursery), server_time: new Date().toISOString() };
}

async function serverChanges(nursery) {
  const batches = await inventory.listBatches(nursery);
  // Archived species are left out automatically (paranoid model)
  const species = await PlantSpecies.findAll({ order: [['common_name', 'ASC']] });
  return { batches, species };
}

module.exports = { applyChanges, serverChanges };

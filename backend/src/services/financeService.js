// FinanceService (Figure 7): sales, expenses and profit or loss (FR05).
const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Batch, Sale, Expense, PlantSpecies } = require('../models');
const HttpError = require('../utils/httpError');
const { todayKigali, kigaliDayStart, addDays } = require('../utils/dates');
const audit = require('./auditService');
const { availableQuantity } = require('./stockService');
const { findOwnBatch, existingByUuid } = require('./inventoryService');

const EXPENSE_CATEGORIES = ['seeds', 'fertiliser', 'pesticide', 'water', 'labour', 'transport', 'tools', 'rent', 'other'];

// Records a sale and reduces the batch stock in the same transaction.
// A sale larger than the AVAILABLE stock is refused (FR05; available excludes plants promised on the board).
async function recordSale(nursery, user, data) {
  return sequelize.transaction(async (transaction) => {
    const existing = await existingByUuid(Sale, data.client_uuid, nursery, transaction);
    if (existing) return { sale: existing, duplicate: true };

    // Offline: a sale may point at a batch that was also created offline (by its client_uuid)
    let batchId = data.batch_id;
    if (!batchId && data.batch_client_uuid) {
      const parent = await Batch.findOne({ where: { client_uuid: data.batch_client_uuid, nursery_id: nursery.id }, transaction });
      if (!parent) throw new HttpError(404, 'NOT_FOUND', 'Batch not found');
      batchId = parent.id;
    }
    // Row lock: two sales from two phones at the same moment cannot both take the last plants
    const batch = await findOwnBatch(nursery, batchId, { transaction, lock: true });
    if (batch.stage === 'cleared') throw new HttpError(409, 'BATCH_CLEARED', 'This batch is cleared');

    const available = await availableQuantity(batch, { transaction });
    if (data.quantity > available) {
      throw new HttpError(409, 'SALE_EXCEEDS_STOCK', 'The sale is larger than the available stock', { available });
    }

    await batch.update({ quantity_current: batch.quantity_current - data.quantity }, { transaction });
    const sale = await Sale.create(
      {
        batch_id: batch.id,
        nursery_id: nursery.id,
        quantity: data.quantity,
        unit_price: data.unit_price ?? batch.unit_price,
        sold_at: data.sold_at || new Date(),
        customer_note: data.customer_note || null,
        client_uuid: data.client_uuid || crypto.randomUUID(),
      },
      { transaction }
    );
    await audit.log({ actorId: user.id, action: 'sale.recorded', entityType: 'sale', entityId: sale.id }, { transaction });
    return { sale, duplicate: false };
  });
}

// Correcting a mistaken sale: the sale is archived and the plants go back into the batch.
async function archiveSale(nursery, user, saleId, reason) {
  return sequelize.transaction(async (transaction) => {
    const sale = await Sale.findOne({ where: { id: saleId, nursery_id: nursery.id }, transaction });
    if (!sale) throw new HttpError(404, 'NOT_FOUND', 'Sale not found');
    const batch = await findOwnBatch(nursery, sale.batch_id, { transaction, lock: true });
    await batch.update({ quantity_current: batch.quantity_current + sale.quantity }, { transaction });
    await sale.destroy({ transaction });
    await audit.log({ actorId: user.id, action: 'sale.archived', entityType: 'sale', entityId: sale.id, reason }, { transaction });
  });
}

async function recordExpense(nursery, user, data) {
  return sequelize.transaction(async (transaction) => {
    const existing = await existingByUuid(Expense, data.client_uuid, nursery, transaction);
    if (existing) return { expense: existing, duplicate: true };
    const expense = await Expense.create(
      {
        nursery_id: nursery.id,
        category: data.category,
        amount: data.amount,
        spent_at: data.spent_at || todayKigali(),
        note: data.note || null,
        client_uuid: data.client_uuid || crypto.randomUUID(),
      },
      { transaction }
    );
    await audit.log({ actorId: user.id, action: 'expense.recorded', entityType: 'expense', entityId: expense.id }, { transaction });
    return { expense, duplicate: false };
  });
}

async function archiveExpense(nursery, user, expenseId, reason) {
  const expense = await Expense.findOne({ where: { id: expenseId, nursery_id: nursery.id } });
  if (!expense) throw new HttpError(404, 'NOT_FOUND', 'Expense not found');
  await expense.destroy();
  await audit.log({ actorId: user.id, action: 'expense.archived', entityType: 'expense', entityId: expense.id, reason });
}

// Period filter: from/to are Kigali dates "YYYY-MM-DD" (to is inclusive)
function saleRange(from, to) {
  const range = {};
  if (from) range[Op.gte] = kigaliDayStart(from);
  if (to) range[Op.lt] = kigaliDayStart(addDays(to, 1));
  return Object.getOwnPropertySymbols(range).length ? { sold_at: range } : {};
}

function expenseRange(from, to) {
  const range = {};
  if (from) range[Op.gte] = from;
  if (to) range[Op.lte] = to;
  return Object.getOwnPropertySymbols(range).length ? { spent_at: range } : {};
}

async function listSales(nursery, { from, to, batchId, limit = 200 } = {}) {
  const where = { nursery_id: nursery.id, ...saleRange(from, to) };
  if (batchId) where.batch_id = batchId;
  return Sale.findAll({
    where,
    include: [{ model: Batch, as: 'batch', paranoid: false, include: [{ model: PlantSpecies, as: 'species', paranoid: false }] }],
    order: [['sold_at', 'DESC']],
    limit,
  });
}

async function listExpenses(nursery, { from, to, limit = 200 } = {}) {
  return Expense.findAll({ where: { nursery_id: nursery.id, ...expenseRange(from, to) }, order: [['spent_at', 'DESC'], ['id', 'DESC']], limit });
}

// Income, expenses and profit for a period, with income split by species and by batch,
// and a month-by-month table. Expenses are recorded by category, not per batch, so profit is
// shown for the whole nursery (docs/DEVIATIONS.md F7).
async function profitLoss(nursery, { from, to } = {}) {
  const sales = await listSales(nursery, { from, to, limit: 100000 });
  const expenses = await listExpenses(nursery, { from, to, limit: 100000 });

  const bySpecies = {};
  const byBatch = {};
  const monthly = {};
  let income = 0;
  for (const sale of sales) {
    const amount = sale.quantity * sale.unit_price;
    income += amount;
    const speciesName = sale.batch?.species?.common_name || '?';
    bySpecies[speciesName] = bySpecies[speciesName] || { species: speciesName, units: 0, income: 0 };
    bySpecies[speciesName].units += sale.quantity;
    bySpecies[speciesName].income += amount;
    byBatch[sale.batch_id] = byBatch[sale.batch_id] || { batch_id: sale.batch_id, species: speciesName, units: 0, income: 0 };
    byBatch[sale.batch_id].units += sale.quantity;
    byBatch[sale.batch_id].income += amount;
    const month = todayKigali(new Date(sale.sold_at)).slice(0, 7);
    monthly[month] = monthly[month] || { month, income: 0, expenses: 0 };
    monthly[month].income += amount;
  }

  const byCategory = {};
  let totalExpenses = 0;
  for (const expense of expenses) {
    totalExpenses += expense.amount;
    byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
    const month = String(expense.spent_at).slice(0, 7);
    monthly[month] = monthly[month] || { month, income: 0, expenses: 0 };
    monthly[month].expenses += expense.amount;
  }

  return {
    from: from || null,
    to: to || null,
    income,
    expenses: totalExpenses,
    profit: income - totalExpenses,
    units_sold: sales.reduce((n, s) => n + s.quantity, 0),
    by_species: Object.values(bySpecies).sort((a, b) => b.income - a.income),
    by_batch: Object.values(byBatch).sort((a, b) => b.income - a.income),
    expenses_by_category: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })),
    monthly: Object.values(monthly)
      .map((m) => ({ ...m, profit: m.income - m.expenses }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}

module.exports = {
  EXPENSE_CATEGORIES,
  recordSale,
  archiveSale,
  recordExpense,
  archiveExpense,
  listSales,
  listExpenses,
  profitLoss,
};

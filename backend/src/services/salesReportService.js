// SalesReportService: the administrator's view of every sale recorded by every nursery
// (docs/DEVIATIONS.md W45). It reads the SALES table directly; there is no second copy of the data.
//
// - Online sales and sales synced from offline phones are the same rows (sync uses recordSale).
// - A sale the nursery removed (to correct a mistake or after a refund) is archived (archived_at set)
//   and is left out here, so every total always matches the current state.
// - All totals are calculated by MySQL over ALL matching rows, never from the page of rows that is shown.
//
// Period (Kigali calendar days, Kigali is always UTC+2):
//   today | week (Monday to today) | month (1st to today) | year (1 January to today)
//   custom (from / to, both optional) | all
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const { todayKigali, addDays, kigaliDayStart } = require('../utils/dates');

const PERIODS = ['today', 'week', 'month', 'year', 'custom', 'all'];
const ROW_LIMIT = 500; // rows shown on the page; the CSV export has every row
const EXPORT_LIMIT = 100000;

// The first and last Kigali date of a period (null = open-ended)
function periodRange(period = 'month', { from, to } = {}, today = todayKigali()) {
  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'week': {
      const day = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
      return { from: addDays(today, -((day + 6) % 7)), to: today };
    }
    case 'month':
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'custom':
      return { from: from || null, to: to || null };
    default:
      return { from: null, to: null };
  }
}

// WHERE clause shared by the totals, the breakdowns, the rows and the CSV, so they always agree
function buildFilter({ period, from, to, nurseryId, speciesId, search } = {}) {
  const range = periodRange(period, { from, to });
  const conditions = ['s.archived_at IS NULL'];
  const replacements = {};
  if (range.from) {
    conditions.push('s.sold_at >= :start');
    replacements.start = kigaliDayStart(range.from);
  }
  if (range.to) {
    conditions.push('s.sold_at < :end'); // "to" is inclusive: before the start of the next day
    replacements.end = kigaliDayStart(addDays(range.to, 1));
  }
  if (nurseryId) {
    conditions.push('s.nursery_id = :nurseryId');
    replacements.nurseryId = Number(nurseryId);
  }
  if (speciesId) {
    conditions.push('b.species_id = :speciesId');
    replacements.speciesId = Number(speciesId);
  }
  if (search && search.trim()) {
    // % and _ typed by the user are searched for literally
    replacements.search = `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push('(n.name LIKE :search OR p.common_name LIKE :search OR p.kinyarwanda_name LIKE :search OR s.customer_note LIKE :search)');
  }
  return { range, replacements, where: `WHERE ${conditions.join(' AND ')}` };
}

// Archived batches, nurseries and species still join, so old sales never lose their names
const FROM = `FROM sales s
                JOIN nurseries n ON n.id = s.nursery_id
                JOIN batches b ON b.id = s.batch_id
                JOIN plant_species p ON p.id = b.species_id`;
const TOTALS = 'COUNT(s.id) AS sales, COALESCE(SUM(s.quantity), 0) AS plants, COALESCE(SUM(s.quantity * s.unit_price), 0) AS amount';

const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const totalsJson = (r) => ({ amount: Number(r.amount), sales: Number(r.sales), plants: Number(r.plants) });

// A DATETIME from MySQL as a real instant (the connection stores and reads UTC)
const asDate = (value) => (value instanceof Date ? value : new Date(`${String(value).replace(' ', 'T')}Z`));

function rowJson(r) {
  return {
    id: r.id,
    sold_at: asDate(r.sold_at).toISOString(),
    nursery: { id: r.nursery_id, name: r.nursery_name, district: r.district },
    species: { id: r.species_id, name: r.species_name },
    quantity: Number(r.quantity),
    unit_price: Number(r.unit_price),
    total: Number(r.total),
    customer_note: r.customer_note || null,
  };
}

const ROW_SELECT = `SELECT s.id, s.sold_at, s.quantity, s.unit_price, s.quantity * s.unit_price AS total, s.customer_note,
                           n.id AS nursery_id, n.name AS nursery_name, n.district, p.id AS species_id, p.common_name AS species_name
                    ${FROM}`;

async function report(filters = {}) {
  const { range, replacements, where } = buildFilter(filters);
  const [totals] = await select(`SELECT ${TOTALS} ${FROM} ${where}`, replacements);
  const byNursery = await select(
    `SELECT n.id, n.name, n.district, ${TOTALS} ${FROM} ${where} GROUP BY n.id, n.name, n.district ORDER BY amount DESC, n.name ASC`,
    replacements
  );
  const bySpecies = await select(
    `SELECT p.id, p.common_name AS name, ${TOTALS} ${FROM} ${where} GROUP BY p.id, p.common_name ORDER BY amount DESC, p.common_name ASC`,
    replacements
  );
  const rows = await select(`${ROW_SELECT} ${where} ORDER BY s.sold_at DESC, s.id DESC LIMIT ${ROW_LIMIT}`, replacements);
  return {
    period: filters.period || 'month',
    from: range.from,
    to: range.to,
    totals: totalsJson(totals),
    by_nursery: byNursery.map((r) => ({ id: r.id, name: r.name, district: r.district, ...totalsJson(r) })),
    by_species: bySpecies.map((r) => ({ id: r.id, name: r.name, ...totalsJson(r) })),
    rows: rows.map(rowJson),
    row_limit: ROW_LIMIT,
  };
}

// ---- CSV export ----

// One CSV cell. Text that starts with = + - @ is prefixed with ' so a spreadsheet never runs it
// as a formula (CSV injection); quotes are doubled.
function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Kigali date and time "2026-11-18 14:05"
const kigaliTime = (date) => new Date(date.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');

async function exportCsv(filters = {}) {
  const { range, replacements, where } = buildFilter(filters);
  const rows = await select(`${ROW_SELECT} ${where} ORDER BY s.sold_at DESC, s.id DESC LIMIT ${EXPORT_LIMIT}`, replacements);
  const header = ['sale_id', 'date_kigali', 'nursery', 'district', 'species', 'quantity', 'unit_price_rwf', 'total_rwf', 'payment_note'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [r.id, kigaliTime(asDate(r.sold_at)), r.nursery_name, r.district, r.species_name, Number(r.quantity), Number(r.unit_price), Number(r.total), r.customer_note || '']
        .map(csvCell)
        .join(',')
    );
  }
  // ﻿ lets Excel open the file as UTF-8 (Kinyarwanda names, accents)
  return { csv: `﻿${lines.join('\r\n')}\r\n`, count: rows.length, range };
}

module.exports = { PERIODS, periodRange, buildFilter, report, exportCsv, csvCell };

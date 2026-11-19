// One-time copy of every row from the old MySQL database into the PostgreSQL (Neon) database.
//
//   node scripts/copy-mysql-to-postgres.js --dry   copy inside a transaction, check, then ROLL BACK
//   node scripts/copy-mysql-to-postgres.js         copy, check, then COMMIT
//
// Source: MYSQL_SOURCE_URL=mysql://user:password@host:port/database (plus MYSQL_SOURCE_CA=path to a CA file
// when the server needs one). It is only read, in a read-only session.
// Target: DATABASE_URL (PostgreSQL). Its tables must already exist (npm run migrate:live). They are
// emptied first (TRUNCATE ... RESTART IDENTITY), then filled with the source rows, keeping every id so
// links between records stay correct, and the id counters are moved past the highest copied id.
// The whole copy is one transaction: if any row fails or any count differs, nothing is kept.
// Connection details are never printed.
const fs = require('fs');
const path = require('path');

const dry = process.argv.includes('--dry');
const sourceUrl = process.env.MYSQL_SOURCE_URL;
const targetUrl = process.env.DATABASE_URL;
if (!sourceUrl || !targetUrl) {
  console.error('Set MYSQL_SOURCE_URL (the old MySQL database) and DATABASE_URL (the new PostgreSQL database).');
  process.exit(1);
}

const mysql = require('mysql2/promise');
const { Client } = require('pg');

const SKIP = new Set(['SequelizeMeta']); // the target keeps its own migration history

// Converts one MySQL value to what the PostgreSQL column expects.
function convert(value, column) {
  if (value === null || value === undefined) return null;
  switch (column.data_type) {
    case 'boolean':
      return value === true || value === 1 || value === '1';
    case 'timestamp with time zone':
    case 'timestamp without time zone':
      if (String(value).startsWith('0000-00-00')) return null;
      return `${value}+00`; // MySQL stored UTC (Sequelize timezone +00:00)
    case 'date':
      return String(value).startsWith('0000-00-00') ? null : String(value).slice(0, 10);
    case 'json':
    case 'jsonb':
      return typeof value === 'string' ? value : JSON.stringify(value);
    default:
      return value;
  }
}

async function main() {
  const src = new URL(sourceUrl);
  const ca = process.env.MYSQL_SOURCE_CA ? fs.readFileSync(path.resolve(process.env.MYSQL_SOURCE_CA), 'utf8') : undefined;
  const source = await mysql.createConnection({
    host: src.hostname,
    port: Number(src.port || 3306),
    user: decodeURIComponent(src.username),
    password: decodeURIComponent(src.password),
    database: decodeURIComponent(src.pathname.slice(1)),
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true },
    dateStrings: true,
    connectTimeout: 20000,
  });
  await source.query('SET SESSION TRANSACTION READ ONLY');

  const tgt = new URL(targetUrl);
  const target = new Client({
    host: tgt.hostname,
    port: Number(tgt.port || 5432),
    user: decodeURIComponent(tgt.username),
    password: decodeURIComponent(tgt.password),
    database: decodeURIComponent(tgt.pathname.slice(1)),
    ssl: { rejectUnauthorized: true },
  });
  await target.connect();

  // Target tables, their columns and foreign keys
  const { rows: tableRows } = await target.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'"
  );
  const tables = tableRows.map((r) => r.table_name).filter((t) => !SKIP.has(t));
  const { rows: columnRows } = await target.query(
    'SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = current_schema()'
  );
  const columnsOf = {};
  for (const c of columnRows) (columnsOf[c.table_name] ||= {})[c.column_name] = c;
  const { rows: fkRows } = await target.query(`
    SELECT cl.relname AS child, pa.relname AS parent, att.attname AS column_name
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_class pa ON pa.oid = con.confrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
     WHERE con.contype = 'f' AND ns.nspname = current_schema()`);

  // Parents before children; a column pointing at its own table is filled in a second pass
  const selfRefs = {};
  const deps = Object.fromEntries(tables.map((t) => [t, new Set()]));
  for (const fk of fkRows) {
    if (!deps[fk.child]) continue;
    if (fk.child === fk.parent) (selfRefs[fk.child] ||= []).push(fk.column_name);
    else deps[fk.child].add(fk.parent);
  }
  const order = [];
  const done = new Set();
  while (order.length < tables.length) {
    const ready = tables.filter((t) => !done.has(t) && [...deps[t]].every((p) => done.has(p) || !deps[p]));
    if (!ready.length) throw new Error('Circular foreign keys between: ' + tables.filter((t) => !done.has(t)).join(', '));
    for (const t of ready.sort()) {
      order.push(t);
      done.add(t);
    }
  }

  const [sourceTableRows] = await source.query('SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()');
  const sourceTables = new Set(sourceTableRows.map((r) => r.t));

  const report = [];
  await target.query('BEGIN');
  try {
    await target.query(`TRUNCATE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
    const pending = []; // self-references to set after all rows exist

    for (const table of order) {
      if (!sourceTables.has(table)) {
        report.push({ table, source: 'missing', copied: 0 });
        continue;
      }
      const [rows] = await source.query(`SELECT * FROM \`${table}\` ORDER BY 1`);
      const targetCols = columnsOf[table];
      const sourceCols = rows.length ? Object.keys(rows[0]) : [];
      const cols = sourceCols.filter((c) => targetCols[c]);
      const dropped = sourceCols.filter((c) => !targetCols[c]);
      const self = selfRefs[table] || [];

      for (const row of rows) {
        const values = cols.map((c) => (self.includes(c) ? null : convert(row[c], targetCols[c])));
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        await target.query(`INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`, values);
        for (const c of self) if (row[c] !== null) pending.push({ table, column: c, id: row.id, value: row[c] });
      }
      report.push({ table, source: rows.length, copied: rows.length, dropped: dropped.join(',') });
    }

    for (const p of pending) await target.query(`UPDATE "${p.table}" SET "${p.column}" = $1 WHERE id = $2`, [p.value, p.id]);

    // Move each id counter past the highest copied id
    for (const table of tables) {
      if (!columnsOf[table].id) continue;
      await target.query(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), (SELECT COUNT(*) > 0 FROM "${table}"))`
      );
    }

    // Every count must match before anything is kept
    let mismatch = false;
    for (const r of report) {
      if (r.source === 'missing') continue;
      const { rows: [{ n }] } = await target.query(`SELECT COUNT(*)::int AS n FROM "${r.table}"`);
      r.inTarget = n;
      if (n !== r.source) mismatch = true;
    }
    console.table(report);
    if (mismatch) throw new Error('Row counts differ; nothing was kept.');
    if (dry) {
      await target.query('ROLLBACK');
      console.log('Dry run: everything copied and checked, then rolled back. Nothing was changed.');
    } else {
      await target.query('COMMIT');
      console.log(`Copied ${report.reduce((sum, r) => sum + (r.copied || 0), 0)} rows and committed.`);
    }
  } catch (error) {
    await target.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((error) => {
  console.error('Copy failed, nothing was changed:', error.message);
  process.exit(1);
});

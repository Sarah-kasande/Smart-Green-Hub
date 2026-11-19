// Small helpers so every migration defines ids, foreign keys and timestamps the same way.
// (Kept outside src/migrations because sequelize-cli treats every file there as a migration.)

function id(Sequelize) {
  return { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false };
}

// Foreign key. RESTRICT stops a parent row from being deleted while children point to it:
// records are archived (archived_at), never deleted (FR16).
function fk(Sequelize, table, { allowNull = false } = {}) {
  return {
    type: Sequelize.INTEGER,
    allowNull,
    references: { model: table, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  };
}

// created_at / updated_at, plus archived_at for tables whose rows can be archived.
function timestamps(Sequelize, { archivable = false } = {}) {
  const columns = {
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
  };
  if (archivable) columns.archived_at = { type: Sequelize.DATE, allowNull: true };
  return columns;
}

const isPostgres = (queryInterface) => queryInterface.sequelize.getDialect() === 'postgres';

// Changes the list of values of an ENUM column, on MySQL and on PostgreSQL.
// MySQL keeps ENUM values in the column itself, so changeColumn is enough. PostgreSQL keeps them in a
// separate type ("enum_<table>_<column>", the name Sequelize gives it), and Sequelize's changeColumn
// tries to create that type again and fails. So on PostgreSQL a new type is built, the column is
// switched to it (rows keep their values; a value that is no longer allowed makes this fail, which
// is the safe outcome) and the old type is dropped. Running it twice gives the same result.
async function changeEnumColumn(queryInterface, Sequelize, table, column, values, { allowNull = false, defaultValue } = {}) {
  if (!isPostgres(queryInterface)) {
    const definition = { type: Sequelize.ENUM(...values), allowNull };
    if (defaultValue !== undefined) definition.defaultValue = defaultValue;
    await queryInterface.changeColumn(table, column, definition);
    return;
  }
  const literal = (value) => `'${String(value).replace(/'/g, "''")}'`;
  const type = `enum_${table}_${column}`;
  const next = `${type}_next`;
  const run = (sql) => queryInterface.sequelize.query(sql);
  await run(`DROP TYPE IF EXISTS "${next}"`);
  await run(`CREATE TYPE "${next}" AS ENUM (${values.map(literal).join(', ')})`);
  await run(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`);
  await run(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE "${next}" USING "${column}"::text::"${next}"`);
  await run(`DROP TYPE IF EXISTS "${type}"`);
  await run(`ALTER TYPE "${next}" RENAME TO "${type}"`);
  if (defaultValue !== undefined) await run(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT ${literal(defaultValue)}`);
  await run(`ALTER TABLE "${table}" ALTER COLUMN "${column}" ${allowNull ? 'DROP' : 'SET'} NOT NULL`);
}

module.exports = { id, fk, timestamps, isPostgres, changeEnumColumn };

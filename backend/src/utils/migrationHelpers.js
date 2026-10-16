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

module.exports = { id, fk, timestamps };

'use strict';
const { fk } = require('../utils/migrationHelpers');

// Who did what, when and why (FR16). Rows are only ever added, never changed or deleted.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
      // NULL when the system itself acted (e.g. the nightly risk job)
      actor_id: fk(Sequelize, 'users', { allowNull: true }),
      action: { type: Sequelize.STRING(60), allowNull: false },
      entity_type: { type: Sequelize.STRING(60), allowNull: false },
      entity_id: { type: Sequelize.INTEGER, allowNull: true },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};

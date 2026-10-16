'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

// Supporting table (not in the proposal ERD): FR04 asks for a record of every stock
// adjustment with its reason, and FR13 says adjustments can be recorded offline.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_adjustments', {
      id: id(Sequelize),
      batch_id: fk(Sequelize, 'batches'),
      nursery_id: fk(Sequelize, 'nurseries'),
      // Positive adds stock, negative removes it (e.g. -20 for plants lost to disease)
      quantity_change: { type: Sequelize.INTEGER, allowNull: false },
      reason: { type: Sequelize.STRING(255), allowNull: false },
      adjusted_by: fk(Sequelize, 'users'),
      adjusted_at: { type: Sequelize.DATE, allowNull: false },
      client_uuid: { type: Sequelize.CHAR(36), allowNull: false, unique: true },
      ...timestamps(Sequelize),
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('stock_adjustments');
  },
};

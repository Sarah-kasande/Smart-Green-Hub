'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('risk_alerts', {
      id: id(Sequelize),
      batch_id: fk(Sequelize, 'batches'),
      risk_level: { type: Sequelize.ENUM('low', 'medium', 'high'), allowNull: false },
      projected_unsold: { type: Sequelize.INTEGER, allowNull: false },
      days_to_prime_end: { type: Sequelize.INTEGER, allowNull: false },
      // Added to the ERD so the operator can see why the batch was flagged
      sales_rate: { type: Sequelize.DECIMAL(10, 4), allowNull: false, defaultValue: 0 },
      risk_ratio: { type: Sequelize.DECIMAL(5, 4), allowNull: false, defaultValue: 0 },
      suggested_action: {
        type: Sequelize.ENUM('reduce_or_discount', 'discount_or_transplant', 'surplus_board_or_donate'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('open', 'acknowledged', 'resolved', 'dismissed'),
        allowNull: false,
        defaultValue: 'open',
      },
      generated_at: { type: Sequelize.DATE, allowNull: false },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex('risk_alerts', ['batch_id', 'status']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('risk_alerts');
  },
};

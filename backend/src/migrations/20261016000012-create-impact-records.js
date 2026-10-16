'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('impact_records', {
      id: id(Sequelize),
      // Exactly one impact record per fulfilled request
      request_id: { ...fk(Sequelize, 'surplus_requests'), unique: true },
      quantity_delivered: { type: Sequelize.INTEGER, allowNull: false },
      planting_site: { type: Sequelize.STRING(255), allowNull: false },
      district: { type: Sequelize.STRING(60), allowNull: false },
      land_cleared_sqm: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      recorded_at: { type: Sequelize.DATE, allowNull: false },
      ...timestamps(Sequelize),
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('impact_records');
  },
};

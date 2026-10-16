'use strict';
const { id, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('plant_species', {
      id: id(Sequelize),
      common_name: { type: Sequelize.STRING(120), allowNull: false },
      kinyarwanda_name: { type: Sequelize.STRING(120), allowNull: true },
      category: { type: Sequelize.ENUM('flower', 'tree', 'shrub', 'other'), allowNull: false },
      // Days from planting until the batch is ready to sell
      default_days_to_ready: { type: Sequelize.INTEGER, allowNull: false },
      // Length of the prime (best-selling) window after the ready date
      default_prime_days: { type: Sequelize.INTEGER, allowNull: false },
      ...timestamps(Sequelize, { archivable: true }),
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('plant_species');
  },
};

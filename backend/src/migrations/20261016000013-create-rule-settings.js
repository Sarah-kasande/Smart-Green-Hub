'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

// Thresholds used by the risk engine and planting planner (Table 5).
// A row with species_id = NULL is the default rule. A row with a species only overrides it.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rule_settings', {
      id: id(Sequelize),
      species_id: fk(Sequelize, 'plant_species', { allowNull: true }),
      // NULL = use PLANT_SPECIES.default_prime_days
      prime_window_days: { type: Sequelize.INTEGER, allowNull: true },
      sales_lookback_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 28 },
      medium_risk_ratio: { type: Sequelize.DECIMAL(4, 2), allowNull: false, defaultValue: 0.2 },
      high_risk_ratio: { type: Sequelize.DECIMAL(4, 2), allowNull: false, defaultValue: 0.5 },
      safety_margin: { type: Sequelize.DECIMAL(4, 2), allowNull: false, defaultValue: 0.1 },
      // Added to the ERD: the day limits for suggested actions (Table 5 lists them as settings)
      far_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 28 },
      near_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 7 },
      updated_by: fk(Sequelize, 'users', { allowNull: true }),
      ...timestamps(Sequelize),
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('rule_settings');
  },
};

'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('planting_recommendations', {
      id: id(Sequelize),
      nursery_id: fk(Sequelize, 'nurseries'),
      species_id: fk(Sequelize, 'plant_species'),
      // NULL when there is not enough sales history (FR08)
      recommended_qty: { type: Sequelize.INTEGER, allowNull: true },
      basis_text: { type: Sequelize.TEXT, allowNull: false },
      target_season: { type: Sequelize.STRING(40), allowNull: true },
      status: {
        type: Sequelize.ENUM('suggested', 'accepted', 'dismissed'),
        allowNull: false,
        defaultValue: 'suggested',
      },
      generated_at: { type: Sequelize.DATE, allowNull: false },
      ...timestamps(Sequelize),
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('planting_recommendations');
  },
};

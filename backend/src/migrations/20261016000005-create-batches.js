'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('batches', {
      id: id(Sequelize),
      nursery_id: fk(Sequelize, 'nurseries'),
      species_id: fk(Sequelize, 'plant_species'),
      quantity_initial: { type: Sequelize.INTEGER, allowNull: false },
      quantity_current: { type: Sequelize.INTEGER, allowNull: false },
      planting_date: { type: Sequelize.DATEONLY, allowNull: false },
      expected_ready_date: { type: Sequelize.DATEONLY, allowNull: false },
      prime_end_date: { type: Sequelize.DATEONLY, allowNull: false },
      stage: {
        type: Sequelize.ENUM('seedling', 'growing', 'ready', 'overgrown', 'cleared'),
        allowNull: false,
        defaultValue: 'seedling',
      },
      // Whole Rwandan francs (RWF has no smaller unit in use)
      unit_price: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      // Created on the device so a repeated offline upload is ignored (FR13)
      client_uuid: { type: Sequelize.CHAR(36), allowNull: false, unique: true },
      ...timestamps(Sequelize, { archivable: true }),
    });
    await queryInterface.addIndex('batches', ['nursery_id', 'stage']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('batches');
  },
};

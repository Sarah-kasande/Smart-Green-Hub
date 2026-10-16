'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('surplus_listings', {
      id: id(Sequelize),
      batch_id: fk(Sequelize, 'batches'),
      nursery_id: fk(Sequelize, 'nurseries'),
      quantity_offered: { type: Sequelize.INTEGER, allowNull: false },
      offer_type: { type: Sequelize.ENUM('free', 'discounted'), allowNull: false },
      // Only for discounted offers. Payment is agreed between the parties outside the system.
      discounted_price: { type: Sequelize.INTEGER, allowNull: true },
      // Added to the ERD: FR09 asks for a pickup note
      pickup_note: { type: Sequelize.STRING(255), allowNull: true },
      available_from: { type: Sequelize.DATEONLY, allowNull: false },
      expires_at: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('active', 'reserved', 'fulfilled', 'expired', 'withdrawn'),
        allowNull: false,
        defaultValue: 'active',
      },
      ...timestamps(Sequelize, { archivable: true }),
    });
    await queryInterface.addIndex('surplus_listings', ['status', 'expires_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('surplus_listings');
  },
};

'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('surplus_requests', {
      id: id(Sequelize),
      listing_id: fk(Sequelize, 'surplus_listings'),
      institution_id: fk(Sequelize, 'institutions'),
      quantity_requested: { type: Sequelize.INTEGER, allowNull: false },
      purpose: { type: Sequelize.STRING(255), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'fulfilled', 'declined', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      // Added to the ERD: optional reason given with approve / decline (FR11)
      decision_reason: { type: Sequelize.STRING(500), allowNull: true },
      decided_at: { type: Sequelize.DATE, allowNull: true },
      // Added to the ERD: stock is reduced only after BOTH of these are set (FR11)
      nursery_confirmed_at: { type: Sequelize.DATE, allowNull: true },
      institution_confirmed_at: { type: Sequelize.DATE, allowNull: true },
      fulfilled_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps(Sequelize),
    });
    // One request per institution per listing
    await queryInterface.addConstraint('surplus_requests', {
      fields: ['listing_id', 'institution_id'],
      type: 'unique',
      name: 'uq_surplus_requests_listing_institution',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('surplus_requests');
  },
};

'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('nurseries', {
      id: id(Sequelize),
      owner_id: fk(Sequelize, 'users'),
      name: { type: Sequelize.STRING(160), allowNull: false },
      district: { type: Sequelize.STRING(60), allowNull: false },
      sector: { type: Sequelize.STRING(60), allowNull: false },
      address_text: { type: Sequelize.STRING(255), allowNull: true },
      latitude: { type: Sequelize.DECIMAL(9, 6), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(9, 6), allowNull: true },
      verification_status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      // Consent to appear in the public directory (FR03). Off until the operator agrees.
      is_listed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      // Added to the ERD: the administrator's reason when details are rejected
      review_note: { type: Sequelize.STRING(500), allowNull: true },
      ...timestamps(Sequelize, { archivable: true }),
    });
    await queryInterface.addIndex('nurseries', ['owner_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('nurseries');
  },
};

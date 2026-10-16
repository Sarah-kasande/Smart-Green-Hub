'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('institutions', {
      id: id(Sequelize),
      // One institution profile per user account (optional one-to-one extension of USERS)
      user_id: { ...fk(Sequelize, 'users'), unique: true },
      org_name: { type: Sequelize.STRING(160), allowNull: false },
      org_type: {
        type: Sequelize.ENUM('school', 'sector_office', 'church', 'hotel', 'community_group'),
        allowNull: false,
      },
      district: { type: Sequelize.STRING(60), allowNull: false },
      sector: { type: Sequelize.STRING(60), allowNull: false },
      contact_phone: { type: Sequelize.STRING(30), allowNull: true },
      verification_status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      // Added to the ERD: the administrator's reason when details are rejected
      review_note: { type: Sequelize.STRING(500), allowNull: true },
      ...timestamps(Sequelize, { archivable: true }),
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('institutions');
  },
};

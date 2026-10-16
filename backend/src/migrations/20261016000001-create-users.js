'use strict';
const { id, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: id(Sequelize),
      role: { type: Sequelize.ENUM('operator', 'institution', 'admin'), allowNull: false },
      full_name: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(190), allowNull: false, unique: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      password_hash: { type: Sequelize.STRING(100), allowNull: false },
      preferred_language: { type: Sequelize.ENUM('en', 'rw'), allowNull: false, defaultValue: 'en' },
      status: { type: Sequelize.ENUM('active', 'suspended'), allowNull: false, defaultValue: 'active' },
      // Added to the ERD: null until the single-use email link is used (FR02)
      email_verified_at: { type: Sequelize.DATE, allowNull: true },
      // Added to the ERD: increased on password reset so older login cookies stop working (FR17)
      token_version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ...timestamps(Sequelize, { archivable: true }),
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};

'use strict';
const { id, fk } = require('../utils/migrationHelpers');

// Supporting table (allowed by the proposal, omitted from its ERD figures):
// single-use links for email confirmation and password reset (FR02, FR17, NFR02).
// Only a SHA-256 hash of the token is stored, so a database leak does not expose working links.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auth_tokens', {
      id: id(Sequelize),
      user_id: fk(Sequelize, 'users'),
      purpose: { type: Sequelize.ENUM('verify_email', 'reset_password'), allowNull: false },
      token_hash: { type: Sequelize.CHAR(64), allowNull: false, unique: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      used_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('auth_tokens', ['user_id', 'purpose']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('auth_tokens');
  },
};

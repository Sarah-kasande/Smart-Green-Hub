'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

// The notification outbox: one row per event and recipient, with retry tracking (FR14).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: id(Sequelize),
      user_id: fk(Sequelize, 'users'),
      // e.g. "alert:12:user:4". Unique, so the same event is never queued twice for one person.
      event_key: { type: Sequelize.STRING(190), allowNull: false, unique: true },
      type: { type: Sequelize.STRING(60), allowNull: false },
      payload_json: { type: Sequelize.JSON, allowNull: true },
      status: { type: Sequelize.ENUM('pending', 'sent', 'failed'), allowNull: false, defaultValue: 'pending' },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sent_at: { type: Sequelize.DATE, allowNull: true },
      // Added to the ERD: in-app "read" state and the last delivery error for the admin
      read_at: { type: Sequelize.DATE, allowNull: true },
      last_error: { type: Sequelize.STRING(500), allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex('notifications', ['user_id', 'read_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  },
};

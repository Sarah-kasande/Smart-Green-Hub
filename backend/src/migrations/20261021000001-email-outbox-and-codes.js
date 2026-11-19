'use strict';

const { changeEnumColumn, isPostgres } = require('../utils/migrationHelpers');

// 1. Every email now goes through the NOTIFICATIONS outbox (docs/DEVIATIONS.md W20):
//    - status: queued | sent | failed | skipped ("pending" is renamed "queued"; "skipped" = printed
//      to the console in development instead of being sent)
//    - recipient_email: the address the email was sent to (kept even if the user changes it later)
//    - in_app: false for emails that must not appear in the in-app notification list (codes)
// 2. Email confirmation and password reset use 6-digit one-time codes instead of links (W21):
//    - attempts: wrong tries on this code (max 5)
//    - token_hash is no longer unique: two different users may receive the same 6-digit code
module.exports = {
  async up(queryInterface, Sequelize) {
    await changeEnumColumn(queryInterface, Sequelize, 'notifications', 'status', ['pending', 'queued', 'sent', 'failed', 'skipped'], { defaultValue: 'queued' });
    await queryInterface.sequelize.query("UPDATE notifications SET status = 'queued' WHERE status = 'pending'");
    await changeEnumColumn(queryInterface, Sequelize, 'notifications', 'status', ['queued', 'sent', 'failed', 'skipped'], { defaultValue: 'queued' });
    await queryInterface.addColumn('notifications', 'recipient_email', { type: Sequelize.STRING(190), allowNull: true });
    await queryInterface.addColumn('notifications', 'in_app', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
    await queryInterface.addIndex('notifications', ['status']);

    await queryInterface.addColumn('auth_tokens', 'attempts', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    // The unique index on token_hash is called "token_hash" in MySQL and is a constraint in PostgreSQL
    if (isPostgres(queryInterface)) {
      await queryInterface.sequelize.query('ALTER TABLE "auth_tokens" DROP CONSTRAINT IF EXISTS "auth_tokens_token_hash_key"');
    } else {
      await queryInterface.removeIndex('auth_tokens', 'token_hash');
    }
    // Old link tokens are useless now: close them
    await queryInterface.sequelize.query('UPDATE auth_tokens SET used_at = NOW() WHERE used_at IS NULL');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('UPDATE auth_tokens SET used_at = NOW() WHERE used_at IS NULL');
    await queryInterface.removeColumn('auth_tokens', 'attempts');
    // Codes can repeat, so the old unique index cannot simply come back; a plain index is added instead
    await queryInterface.addIndex('auth_tokens', ['token_hash'], { name: 'token_hash' });

    await queryInterface.removeIndex('notifications', ['status']);
    await queryInterface.removeColumn('notifications', 'in_app');
    await queryInterface.removeColumn('notifications', 'recipient_email');
    await changeEnumColumn(queryInterface, Sequelize, 'notifications', 'status', ['pending', 'queued', 'sent', 'failed', 'skipped'], { defaultValue: 'pending' });
    await queryInterface.sequelize.query("UPDATE notifications SET status = 'pending' WHERE status IN ('queued', 'skipped')");
    await changeEnumColumn(queryInterface, Sequelize, 'notifications', 'status', ['pending', 'sent', 'failed'], { defaultValue: 'pending' });
  },
};

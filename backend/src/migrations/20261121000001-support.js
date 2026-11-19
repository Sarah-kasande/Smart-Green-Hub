'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

// Support module: help requests to the administrator (docs/DEVIATIONS.md W51). Two NEW tables that the
// proposal's 15-entity ERD did not list:
//
// support_tickets   one help request: who sent it (a signed-in user, or a visitor through the public
//                   contact form: user_id NULL), a copy of their name, email, role and organisation at the
//                   time, category, subject, status (open | in_progress | resolved), when and by whom it was
//                   resolved, the optional "Was this solved?" answer, and client_uuid for offline sending.
// support_messages  the conversation: each message by the user or the administrator; internal = a note
//                   only administrators see; an optional screenshot (uploaded_files, never public).
// uploaded_files.purpose gets one more value: support_screenshot.
//
// Tickets are never deleted (also when the account is archived). Safe on a database with data: only new
// tables and one more ENUM value, no rows inserted. Every step checks first, so it can be repeated.
const { changeEnumColumn } = require('../utils/migrationHelpers');

const PURPOSES_BEFORE = ['verification_document', 'batch_photo'];
const PURPOSES_AFTER = [...PURPOSES_BEFORE, 'support_screenshot'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));

    if (!tables.includes('support_tickets')) {
      await queryInterface.createTable('support_tickets', {
        id: id(Sequelize),
        client_uuid: { type: Sequelize.CHAR(36), allowNull: true, unique: true },
        user_id: fk(Sequelize, 'users', { allowNull: true }),
        requester_role: { type: Sequelize.ENUM('operator', 'institution', 'public'), allowNull: false },
        requester_name: { type: Sequelize.STRING(120), allowNull: false },
        requester_email: { type: Sequelize.STRING(190), allowNull: false },
        organisation_name: { type: Sequelize.STRING(160), allowNull: true },
        category: { type: Sequelize.ENUM('account', 'batches', 'requests', 'sales', 'technical', 'other'), allowNull: false },
        subject: { type: Sequelize.STRING(160), allowNull: false },
        status: { type: Sequelize.ENUM('open', 'in_progress', 'resolved'), allowNull: false, defaultValue: 'open' },
        resolved_at: { type: Sequelize.DATE, allowNull: true },
        resolved_by: fk(Sequelize, 'users', { allowNull: true }),
        solved_feedback: { type: Sequelize.ENUM('yes', 'no'), allowNull: true },
        last_message_at: { type: Sequelize.DATE, allowNull: false },
        ...timestamps(Sequelize),
      });
      await queryInterface.addIndex('support_tickets', ['status'], { name: 'support_tickets_status' });
      await queryInterface.addIndex('support_tickets', ['user_id'], { name: 'support_tickets_user_id' });
    }

    if (!tables.includes('support_messages')) {
      await queryInterface.createTable('support_messages', {
        id: id(Sequelize),
        ticket_id: fk(Sequelize, 'support_tickets'),
        author_user_id: fk(Sequelize, 'users', { allowNull: true }),
        from_admin: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        // A note only administrators see
        internal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        body: { type: Sequelize.TEXT, allowNull: false },
        // If the file row is ever removed, the message stays (without the screenshot)
        attachment_file_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'uploaded_files', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        client_uuid: { type: Sequelize.CHAR(36), allowNull: true, unique: true },
        ...timestamps(Sequelize),
      });
      await queryInterface.addIndex('support_messages', ['ticket_id'], { name: 'support_messages_ticket_id' });
    }

    const files = await queryInterface.describeTable('uploaded_files');
    // MySQL shows the ENUM values in the type text; PostgreSQL lists them in "special"
    const purposeValues = `${files.purpose.type} ${(files.purpose.special || []).join(' ')}`;
    if (!purposeValues.includes('support_screenshot')) {
      await changeEnumColumn(queryInterface, Sequelize, 'uploaded_files', 'purpose', PURPOSES_AFTER);
    }
  },

  // Going back would delete help requests, so it is refused while any exist.
  async down(queryInterface, Sequelize) {
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));
    if (tables.includes('support_tickets')) {
      const [[{ n }]] = await queryInterface.sequelize.query('SELECT COUNT(*) AS n FROM support_tickets');
      if (Number(n) > 0) throw new Error('Cannot undo: help requests exist (support_tickets is not empty).');
    }
    const [[{ files }]] = await queryInterface.sequelize.query("SELECT COUNT(*) AS files FROM uploaded_files WHERE purpose = 'support_screenshot'");
    if (Number(files) > 0) throw new Error('Cannot undo: support screenshots exist.');
    if (tables.includes('support_messages')) await queryInterface.dropTable('support_messages');
    if (tables.includes('support_tickets')) await queryInterface.dropTable('support_tickets');
    await changeEnumColumn(queryInterface, Sequelize, 'uploaded_files', 'purpose', PURPOSES_BEFORE);
  },
};

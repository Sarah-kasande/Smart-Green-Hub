const { SUPPORT_CATEGORIES, SUPPORT_STATUSES } = require('../utils/constants');

// A help request to the administrator (docs/DEVIATIONS.md W51). user_id is NULL for the public contact
// form. The requester's name, email, role and organisation are copied when the ticket is created, so the
// ticket still makes sense if the account changes or is archived. Tickets are never deleted.
module.exports = (sequelize, DataTypes, { common }) =>
  sequelize.define(
    'SupportTicket',
    {
      client_uuid: { type: DataTypes.CHAR(36), unique: true },
      user_id: { type: DataTypes.INTEGER },
      requester_role: { type: DataTypes.ENUM('operator', 'institution', 'public'), allowNull: false },
      requester_name: { type: DataTypes.STRING(120), allowNull: false },
      requester_email: { type: DataTypes.STRING(190), allowNull: false },
      organisation_name: { type: DataTypes.STRING(160) },
      category: { type: DataTypes.ENUM(...SUPPORT_CATEGORIES), allowNull: false },
      subject: { type: DataTypes.STRING(160), allowNull: false },
      status: { type: DataTypes.ENUM(...SUPPORT_STATUSES), allowNull: false, defaultValue: 'open' },
      resolved_at: { type: DataTypes.DATE },
      resolved_by: { type: DataTypes.INTEGER },
      solved_feedback: { type: DataTypes.ENUM('yes', 'no') },
      last_message_at: { type: DataTypes.DATE, allowNull: false },
    },
    { ...common, tableName: 'support_tickets' }
  );

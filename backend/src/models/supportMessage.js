// One message in a help request (docs/DEVIATIONS.md W51). from_admin: written by the administrator.
// internal: a note only administrators see. attachment_file_id: an optional screenshot (uploaded_files),
// served only to its owner and administrators, never public.
module.exports = (sequelize, DataTypes, { common }) =>
  sequelize.define(
    'SupportMessage',
    {
      ticket_id: { type: DataTypes.INTEGER, allowNull: false },
      author_user_id: { type: DataTypes.INTEGER },
      from_admin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      internal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      attachment_file_id: { type: DataTypes.INTEGER },
      client_uuid: { type: DataTypes.CHAR(36), unique: true },
    },
    { ...common, tableName: 'support_messages' }
  );

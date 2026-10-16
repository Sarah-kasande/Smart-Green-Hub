const { NOTIFICATION_STATUSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { common }) =>
  sequelize.define(
    'Notification',
    {
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      event_key: { type: DataTypes.STRING(190), allowNull: false, unique: true },
      type: { type: DataTypes.STRING(60), allowNull: false },
      payload_json: { type: DataTypes.JSON },
      status: { type: DataTypes.ENUM(...NOTIFICATION_STATUSES), allowNull: false, defaultValue: 'pending' },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sent_at: { type: DataTypes.DATE },
      read_at: { type: DataTypes.DATE },
      last_error: { type: DataTypes.STRING(500) },
    },
    { ...common, tableName: 'notifications' }
  );

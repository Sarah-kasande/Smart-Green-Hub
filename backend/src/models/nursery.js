const { VERIFICATION_STATUSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { archivable }) =>
  sequelize.define(
    'Nursery',
    {
      owner_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(160), allowNull: false },
      district: { type: DataTypes.STRING(60), allowNull: false },
      sector: { type: DataTypes.STRING(60), allowNull: false },
      address_text: { type: DataTypes.STRING(255) },
      latitude: { type: DataTypes.DECIMAL(9, 6) },
      longitude: { type: DataTypes.DECIMAL(9, 6) },
      verification_status: { type: DataTypes.ENUM(...VERIFICATION_STATUSES), allowNull: false, defaultValue: 'pending' },
      is_listed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      review_note: { type: DataTypes.STRING(500) },
    },
    { ...archivable, tableName: 'nurseries' }
  );

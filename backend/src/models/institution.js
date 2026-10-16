const { ORG_TYPES, VERIFICATION_STATUSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { archivable }) =>
  sequelize.define(
    'Institution',
    {
      user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      org_name: { type: DataTypes.STRING(160), allowNull: false },
      org_type: { type: DataTypes.ENUM(...ORG_TYPES), allowNull: false },
      district: { type: DataTypes.STRING(60), allowNull: false },
      sector: { type: DataTypes.STRING(60), allowNull: false },
      contact_phone: { type: DataTypes.STRING(30) },
      verification_status: { type: DataTypes.ENUM(...VERIFICATION_STATUSES), allowNull: false, defaultValue: 'pending' },
      review_note: { type: DataTypes.STRING(500) },
    },
    { ...archivable, tableName: 'institutions' }
  );

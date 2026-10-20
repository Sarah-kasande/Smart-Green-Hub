const { REQUEST_STATUSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { common }) =>
  sequelize.define(
    'SurplusRequest',
    {
      listing_id: { type: DataTypes.INTEGER, allowNull: false },
      institution_id: { type: DataTypes.INTEGER, allowNull: false },
      quantity_requested: { type: DataTypes.INTEGER, allowNull: false },
      purpose: { type: DataTypes.STRING(255), allowNull: false },
      status: { type: DataTypes.ENUM(...REQUEST_STATUSES), allowNull: false, defaultValue: 'pending' },
      decision_reason: { type: DataTypes.STRING(500) },
      decided_at: { type: DataTypes.DATE },
      nursery_confirmed_at: { type: DataTypes.DATE },
      institution_confirmed_at: { type: DataTypes.DATE },
      fulfilled_at: { type: DataTypes.DATE },
      planting_site: { type: DataTypes.STRING(255) },
      planting_district: { type: DataTypes.STRING(60) },
      land_cleared_sqm: { type: DataTypes.DECIMAL(10, 2) },
    },
    {
      ...common,
      tableName: 'surplus_requests',
      indexes: [{ unique: true, fields: ['listing_id', 'institution_id'], name: 'uq_surplus_requests_listing_institution' }],
    }
  );

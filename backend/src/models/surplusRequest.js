const { REQUEST_STATUSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { common }) =>
  sequelize.define(
    'SurplusRequest',
    {
      // Exactly one of these two is set (W42): a surplus listing, or a batch from "Available plants"
      listing_id: { type: DataTypes.INTEGER },
      batch_id: { type: DataTypes.INTEGER },
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
      // Optional details from the institution
      preferred_pickup_date: { type: DataTypes.DATEONLY },
      message: { type: DataTypes.STRING(500) },
    },
    {
      ...common,
      tableName: 'surplus_requests',
      indexes: [
        { unique: true, fields: ['listing_id', 'institution_id'], name: 'uq_surplus_requests_listing_institution' },
        { unique: true, fields: ['batch_id', 'institution_id'], name: 'uq_surplus_requests_batch_institution' },
      ],
    }
  );

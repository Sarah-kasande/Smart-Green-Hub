const { OFFER_TYPES, LISTING_STATUSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { archivable }) =>
  sequelize.define(
    'SurplusListing',
    {
      batch_id: { type: DataTypes.INTEGER, allowNull: false },
      nursery_id: { type: DataTypes.INTEGER, allowNull: false },
      quantity_offered: { type: DataTypes.INTEGER, allowNull: false },
      offer_type: { type: DataTypes.ENUM(...OFFER_TYPES), allowNull: false },
      discounted_price: { type: DataTypes.INTEGER },
      pickup_note: { type: DataTypes.STRING(255) },
      available_from: { type: DataTypes.DATEONLY, allowNull: false },
      expires_at: { type: DataTypes.DATEONLY, allowNull: false },
      status: { type: DataTypes.ENUM(...LISTING_STATUSES), allowNull: false, defaultValue: 'active' },
    },
    { ...archivable, tableName: 'surplus_listings' }
  );

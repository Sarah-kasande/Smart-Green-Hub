const { RECOMMENDATION_STATUSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { common }) =>
  sequelize.define(
    'PlantingRecommendation',
    {
      nursery_id: { type: DataTypes.INTEGER, allowNull: false },
      species_id: { type: DataTypes.INTEGER, allowNull: false },
      recommended_qty: { type: DataTypes.INTEGER },
      basis_text: { type: DataTypes.TEXT, allowNull: false },
      target_season: { type: DataTypes.STRING(40) },
      status: { type: DataTypes.ENUM(...RECOMMENDATION_STATUSES), allowNull: false, defaultValue: 'suggested' },
      generated_at: { type: DataTypes.DATE, allowNull: false },
    },
    { ...common, tableName: 'planting_recommendations' }
  );

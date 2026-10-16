module.exports = (sequelize, DataTypes, { common }) =>
  sequelize.define(
    'ImpactRecord',
    {
      request_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      quantity_delivered: { type: DataTypes.INTEGER, allowNull: false },
      planting_site: { type: DataTypes.STRING(255), allowNull: false },
      district: { type: DataTypes.STRING(60), allowNull: false },
      land_cleared_sqm: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      recorded_at: { type: DataTypes.DATE, allowNull: false },
    },
    { ...common, tableName: 'impact_records' }
  );

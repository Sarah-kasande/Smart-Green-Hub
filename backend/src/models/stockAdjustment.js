module.exports = (sequelize, DataTypes, { common }) =>
  sequelize.define(
    'StockAdjustment',
    {
      batch_id: { type: DataTypes.INTEGER, allowNull: false },
      nursery_id: { type: DataTypes.INTEGER, allowNull: false },
      quantity_change: { type: DataTypes.INTEGER, allowNull: false },
      reason: { type: DataTypes.STRING(255), allowNull: false },
      adjusted_by: { type: DataTypes.INTEGER, allowNull: false },
      adjusted_at: { type: DataTypes.DATE, allowNull: false },
      client_uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true },
    },
    { ...common, tableName: 'stock_adjustments' }
  );

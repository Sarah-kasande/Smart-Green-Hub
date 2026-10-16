module.exports = (sequelize, DataTypes, { common }) =>
  sequelize.define(
    'RuleSetting',
    {
      species_id: { type: DataTypes.INTEGER },
      prime_window_days: { type: DataTypes.INTEGER },
      sales_lookback_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 28 },
      medium_risk_ratio: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 0.2 },
      high_risk_ratio: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 0.5 },
      safety_margin: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 0.1 },
      far_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 28 },
      near_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
      updated_by: { type: DataTypes.INTEGER },
    },
    { ...common, tableName: 'rule_settings' }
  );

const { RISK_LEVELS, SUGGESTED_ACTIONS, ALERT_STATUSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { common }) =>
  sequelize.define(
    'RiskAlert',
    {
      batch_id: { type: DataTypes.INTEGER, allowNull: false },
      risk_level: { type: DataTypes.ENUM(...RISK_LEVELS), allowNull: false },
      projected_unsold: { type: DataTypes.INTEGER, allowNull: false },
      days_to_prime_end: { type: DataTypes.INTEGER, allowNull: false },
      sales_rate: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 0 },
      risk_ratio: { type: DataTypes.DECIMAL(5, 4), allowNull: false, defaultValue: 0 },
      suggested_action: { type: DataTypes.ENUM(...SUGGESTED_ACTIONS), allowNull: false },
      status: { type: DataTypes.ENUM(...ALERT_STATUSES), allowNull: false, defaultValue: 'open' },
      generated_at: { type: DataTypes.DATE, allowNull: false },
      resolved_at: { type: DataTypes.DATE },
    },
    { ...common, tableName: 'risk_alerts' }
  );

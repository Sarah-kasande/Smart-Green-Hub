module.exports = (sequelize, DataTypes, { archivable }) =>
  sequelize.define(
    'Expense',
    {
      nursery_id: { type: DataTypes.INTEGER, allowNull: false },
      category: { type: DataTypes.STRING(40), allowNull: false },
      amount: { type: DataTypes.INTEGER, allowNull: false },
      spent_at: { type: DataTypes.DATEONLY, allowNull: false },
      note: { type: DataTypes.STRING(255) },
      client_uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true },
    },
    { ...archivable, tableName: 'expenses' }
  );

module.exports = (sequelize, DataTypes, { archivable }) =>
  sequelize.define(
    'Sale',
    {
      batch_id: { type: DataTypes.INTEGER, allowNull: false },
      nursery_id: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      unit_price: { type: DataTypes.INTEGER, allowNull: false },
      sold_at: { type: DataTypes.DATE, allowNull: false },
      customer_note: { type: DataTypes.STRING(255) },
      client_uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true },
    },
    { ...archivable, tableName: 'sales' }
  );

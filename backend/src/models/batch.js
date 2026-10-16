const { BATCH_STAGES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { archivable }) =>
  sequelize.define(
    'Batch',
    {
      nursery_id: { type: DataTypes.INTEGER, allowNull: false },
      species_id: { type: DataTypes.INTEGER, allowNull: false },
      quantity_initial: { type: DataTypes.INTEGER, allowNull: false },
      quantity_current: { type: DataTypes.INTEGER, allowNull: false },
      planting_date: { type: DataTypes.DATEONLY, allowNull: false },
      expected_ready_date: { type: DataTypes.DATEONLY, allowNull: false },
      prime_end_date: { type: DataTypes.DATEONLY, allowNull: false },
      stage: { type: DataTypes.ENUM(...BATCH_STAGES), allowNull: false, defaultValue: 'seedling' },
      unit_price: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      client_uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true },
    },
    { ...archivable, tableName: 'batches' }
  );

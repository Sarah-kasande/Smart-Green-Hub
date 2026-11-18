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
      // NULL while the species waits for the administrator's approval (no rules yet)
      expected_ready_date: { type: DataTypes.DATEONLY },
      prime_end_date: { type: DataTypes.DATEONLY },
      stage: { type: DataTypes.ENUM(...BATCH_STAGES), allowNull: false, defaultValue: 'seedling' },
      unit_price: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      // "Show to institutions" (W43): when ready, the free plants appear as "Available plants"
      show_to_institutions: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      // Public homepage (W48): published by the administrator (NULL = not published) and its "Featured" position
      published_at: { type: DataTypes.DATE },
      featured_rank: { type: DataTypes.INTEGER },
      client_uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true },
    },
    { ...archivable, tableName: 'batches' }
  );

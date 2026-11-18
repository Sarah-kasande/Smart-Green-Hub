const { SPECIES_CATEGORIES, SPECIES_STATUSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { archivable }) =>
  sequelize.define(
    'PlantSpecies',
    {
      common_name: { type: DataTypes.STRING(120), allowNull: false },
      kinyarwanda_name: { type: DataTypes.STRING(120) },
      category: { type: DataTypes.ENUM(...SPECIES_CATEGORIES), allowNull: false },
      // Set by the administrator. NULL only while a species proposed by a nursery waits for approval.
      default_days_to_ready: { type: DataTypes.INTEGER },
      default_prime_days: { type: DataTypes.INTEGER },
      // Species approval (docs/DEVIATIONS.md W39)
      status: { type: DataTypes.ENUM(...SPECIES_STATUSES), allowNull: false, defaultValue: 'approved' },
      requested_by_nursery_id: { type: DataTypes.INTEGER },
      decided_by: { type: DataTypes.INTEGER },
      decided_at: { type: DataTypes.DATE },
      decision_reason: { type: DataTypes.STRING(500) },
      merged_into_id: { type: DataTypes.INTEGER },
    },
    { ...archivable, tableName: 'plant_species' }
  );

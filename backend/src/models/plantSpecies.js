const { SPECIES_CATEGORIES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { archivable }) =>
  sequelize.define(
    'PlantSpecies',
    {
      common_name: { type: DataTypes.STRING(120), allowNull: false },
      kinyarwanda_name: { type: DataTypes.STRING(120) },
      category: { type: DataTypes.ENUM(...SPECIES_CATEGORIES), allowNull: false },
      default_days_to_ready: { type: DataTypes.INTEGER, allowNull: false },
      default_prime_days: { type: DataTypes.INTEGER, allowNull: false },
    },
    { ...archivable, tableName: 'plant_species' }
  );

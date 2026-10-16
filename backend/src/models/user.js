const { ROLES, LANGUAGES, USER_STATUSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { archivable }) =>
  sequelize.define(
    'User',
    {
      role: { type: DataTypes.ENUM(...ROLES), allowNull: false },
      full_name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
      phone: { type: DataTypes.STRING(30) },
      password_hash: { type: DataTypes.STRING(100), allowNull: false },
      preferred_language: { type: DataTypes.ENUM(...LANGUAGES), allowNull: false, defaultValue: 'en' },
      status: { type: DataTypes.ENUM(...USER_STATUSES), allowNull: false, defaultValue: 'active' },
      email_verified_at: { type: DataTypes.DATE },
      token_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      ...archivable,
      tableName: 'users',
      // Never send the password hash anywhere unless a query asks for it explicitly.
      defaultScope: { attributes: { exclude: ['password_hash'] } },
      scopes: { withPassword: { attributes: { include: ['password_hash'] } } },
    }
  );

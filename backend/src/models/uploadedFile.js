const { FILE_PURPOSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes, { archivable }) =>
  sequelize.define(
    'UploadedFile',
    {
      owner_user_id: { type: DataTypes.INTEGER, allowNull: false },
      purpose: { type: DataTypes.ENUM(...FILE_PURPOSES), allowNull: false },
      entity_type: { type: DataTypes.STRING(40), allowNull: false },
      entity_id: { type: DataTypes.INTEGER, allowNull: false },
      original_name: { type: DataTypes.STRING(255), allowNull: false },
      mime_type: { type: DataTypes.STRING(50), allowNull: false },
      size_bytes: { type: DataTypes.INTEGER, allowNull: false },
      data: { type: DataTypes.BLOB('long'), allowNull: false },
    },
    {
      ...archivable,
      tableName: 'uploaded_files',
      // Lists never load the file bytes (up to 10 MB each); only the download route asks for them.
      defaultScope: { attributes: { exclude: ['data'] } },
      scopes: { withData: { attributes: { include: ['data'] } } },
    }
  );

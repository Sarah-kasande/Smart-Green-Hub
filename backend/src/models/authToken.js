const { TOKEN_PURPOSES } = require('../utils/constants');

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'AuthToken',
    {
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      purpose: { type: DataTypes.ENUM(...TOKEN_PURPOSES), allowNull: false },
      // HMAC of the 6-digit code (never the code itself)
      token_hash: { type: DataTypes.CHAR(64), allowNull: false },
      // wrong tries on this code; at 5 the code is invalidated
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      used_at: { type: DataTypes.DATE },
    },
    { underscored: true, tableName: 'auth_tokens', timestamps: true, createdAt: 'created_at', updatedAt: false }
  );

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      actor_id: { type: DataTypes.INTEGER },
      action: { type: DataTypes.STRING(60), allowNull: false },
      entity_type: { type: DataTypes.STRING(60), allowNull: false },
      entity_id: { type: DataTypes.INTEGER },
      reason: { type: DataTypes.STRING(500) },
    },
    // Audit rows are never updated, so there is no updated_at column.
    { underscored: true, tableName: 'audit_logs', timestamps: true, createdAt: 'created_at', updatedAt: false }
  );

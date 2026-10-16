// Loads every model, then wires up the relationships from the ERD (Figures 3-5).
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

// Settings shared by all models: snake_case columns and created_at / updated_at timestamps.
const common = { underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' };
// Archivable models: Sequelize "paranoid" mode sets archived_at instead of deleting the row (FR16).
const archivable = { ...common, paranoid: true, deletedAt: 'archived_at' };

const define = (file) => require(file)(sequelize, DataTypes, { common, archivable });

const User = define('./user');
const Institution = define('./institution');
const Nursery = define('./nursery');
const PlantSpecies = define('./plantSpecies');
const Batch = define('./batch');
const Sale = define('./sale');
const Expense = define('./expense');
const StockAdjustment = define('./stockAdjustment');
const RiskAlert = define('./riskAlert');
const SurplusListing = define('./surplusListing');
const SurplusRequest = define('./surplusRequest');
const ImpactRecord = define('./impactRecord');
const RuleSetting = define('./ruleSetting');
const PlantingRecommendation = define('./plantingRecommendation');
const Notification = define('./notification');
const AuditLog = define('./auditLog');
const AuthToken = define('./authToken');
const UploadedFile = define('./uploadedFile');

// Identity
User.hasOne(Institution, { foreignKey: 'user_id', as: 'institution' });
Institution.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Nursery, { foreignKey: 'owner_id', as: 'nurseries' });
Nursery.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
User.hasMany(AuthToken, { foreignKey: 'user_id' });
AuthToken.belongsTo(User, { foreignKey: 'user_id' });

// Inventory and finance
Nursery.hasMany(Batch, { foreignKey: 'nursery_id', as: 'batches' });
Batch.belongsTo(Nursery, { foreignKey: 'nursery_id', as: 'nursery' });
PlantSpecies.hasMany(Batch, { foreignKey: 'species_id', as: 'batches' });
Batch.belongsTo(PlantSpecies, { foreignKey: 'species_id', as: 'species' });
Batch.hasMany(Sale, { foreignKey: 'batch_id', as: 'sales' });
Sale.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });
Nursery.hasMany(Sale, { foreignKey: 'nursery_id', as: 'sales' });
Sale.belongsTo(Nursery, { foreignKey: 'nursery_id', as: 'nursery' });
Nursery.hasMany(Expense, { foreignKey: 'nursery_id', as: 'expenses' });
Expense.belongsTo(Nursery, { foreignKey: 'nursery_id', as: 'nursery' });
Batch.hasMany(StockAdjustment, { foreignKey: 'batch_id', as: 'adjustments' });
StockAdjustment.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });
StockAdjustment.belongsTo(User, { foreignKey: 'adjusted_by', as: 'adjustedBy' });

// Risk, surplus and impact
Batch.hasMany(RiskAlert, { foreignKey: 'batch_id', as: 'alerts' });
RiskAlert.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });
Batch.hasMany(SurplusListing, { foreignKey: 'batch_id', as: 'listings' });
SurplusListing.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });
Nursery.hasMany(SurplusListing, { foreignKey: 'nursery_id', as: 'listings' });
SurplusListing.belongsTo(Nursery, { foreignKey: 'nursery_id', as: 'nursery' });
SurplusListing.hasMany(SurplusRequest, { foreignKey: 'listing_id', as: 'requests' });
SurplusRequest.belongsTo(SurplusListing, { foreignKey: 'listing_id', as: 'listing' });
Institution.hasMany(SurplusRequest, { foreignKey: 'institution_id', as: 'requests' });
SurplusRequest.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
SurplusRequest.hasOne(ImpactRecord, { foreignKey: 'request_id', as: 'impact' });
ImpactRecord.belongsTo(SurplusRequest, { foreignKey: 'request_id', as: 'request' });

// Rules, planning, notifications and audit
PlantSpecies.hasMany(RuleSetting, { foreignKey: 'species_id', as: 'rules' });
RuleSetting.belongsTo(PlantSpecies, { foreignKey: 'species_id', as: 'species' });
RuleSetting.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedBy' });
Nursery.hasMany(PlantingRecommendation, { foreignKey: 'nursery_id', as: 'recommendations' });
PlantingRecommendation.belongsTo(Nursery, { foreignKey: 'nursery_id', as: 'nursery' });
PlantSpecies.hasMany(PlantingRecommendation, { foreignKey: 'species_id', as: 'recommendations' });
PlantingRecommendation.belongsTo(PlantSpecies, { foreignKey: 'species_id', as: 'species' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(AuditLog, { foreignKey: 'actor_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });
UploadedFile.belongsTo(User, { foreignKey: 'owner_user_id', as: 'owner' });

module.exports = {
  sequelize,
  User,
  Institution,
  Nursery,
  PlantSpecies,
  Batch,
  Sale,
  Expense,
  StockAdjustment,
  RiskAlert,
  SurplusListing,
  SurplusRequest,
  ImpactRecord,
  RuleSetting,
  PlantingRecommendation,
  Notification,
  AuditLog,
  AuthToken,
  UploadedFile,
};

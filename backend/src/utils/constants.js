// Allowed values used by models, validation and the frontend.
module.exports = {
  ROLES: ['operator', 'institution', 'admin'],
  // Roles a person may choose when registering. "admin" is never self-assigned (FR02).
  REGISTRABLE_ROLES: ['operator', 'institution'],
  LANGUAGES: ['en', 'rw'],
  USER_STATUSES: ['active', 'suspended'],
  VERIFICATION_STATUSES: ['pending', 'approved', 'rejected'],
  // The three districts of the City of Kigali
  KIGALI_DISTRICTS: ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  ORG_TYPES: ['school', 'sector_office', 'church', 'hotel', 'community_group'],
  SPECIES_CATEGORIES: ['flower', 'tree', 'shrub', 'other'],
  BATCH_STAGES: ['seedling', 'growing', 'ready', 'overgrown', 'cleared'],
  RISK_LEVELS: ['low', 'medium', 'high'],
  SUGGESTED_ACTIONS: ['reduce_or_discount', 'discount_or_transplant', 'surplus_board_or_donate'],
  ALERT_STATUSES: ['open', 'acknowledged', 'resolved', 'dismissed'],
  OFFER_TYPES: ['free', 'discounted'],
  LISTING_STATUSES: ['active', 'reserved', 'fulfilled', 'expired', 'withdrawn'],
  REQUEST_STATUSES: ['pending', 'approved', 'fulfilled', 'declined', 'cancelled'],
  RECOMMENDATION_STATUSES: ['suggested', 'accepted', 'dismissed'],
  NOTIFICATION_STATUSES: ['pending', 'sent', 'failed'],
  TOKEN_PURPOSES: ['verify_email', 'reset_password'],
  FILE_PURPOSES: ['verification_document', 'batch_photo'],
  // Upload rules (NFR03)
  MAX_UPLOAD_BYTES: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg'],
};

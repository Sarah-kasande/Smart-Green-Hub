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
  // approved = in everyone's list; pending = proposed by a nursery, waiting for the administrator;
  // rejected = refused (with a reason); merged = a spelling duplicate joined to an approved species
  SPECIES_STATUSES: ['approved', 'pending', 'rejected', 'merged'],
  BATCH_STAGES: ['seedling', 'growing', 'ready', 'overgrown', 'cleared'],
  RISK_LEVELS: ['low', 'medium', 'high'],
  SUGGESTED_ACTIONS: ['reduce_or_discount', 'discount_or_transplant', 'surplus_board_or_donate'],
  ALERT_STATUSES: ['open', 'acknowledged', 'resolved', 'dismissed'],
  OFFER_TYPES: ['free', 'discounted'],
  LISTING_STATUSES: ['active', 'reserved', 'fulfilled', 'expired', 'withdrawn'],
  REQUEST_STATUSES: ['pending', 'approved', 'fulfilled', 'declined', 'cancelled'],
  // Where a request comes from: a surplus listing, or a ready batch shown as "Available plants" (W42)
  REQUEST_SOURCES: ['surplus_offer', 'available_plant'],
  // What a hand-over means for impact (W44): surplus that was saved from waste, or plants from
  // healthy stock supplied for greening
  IMPACT_TYPES: ['surplus_redirected', 'greening_supply'],
  // Batch stages shown to institutions as "Available plants"
  AVAILABLE_STAGES: ['ready', 'overgrown'],
  RECOMMENDATION_STATUSES: ['suggested', 'accepted', 'dismissed'],
  // queued = waiting to be sent; skipped = printed to the console (development) instead of sent
  NOTIFICATION_STATUSES: ['queued', 'sent', 'failed', 'skipped'],
  TOKEN_PURPOSES: ['verify_email', 'reset_password'],
  FILE_PURPOSES: ['verification_document', 'batch_photo'],
  // Upload rules (NFR03)
  MAX_UPLOAD_BYTES: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg'],
};

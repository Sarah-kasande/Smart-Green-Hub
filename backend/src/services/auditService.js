// AuditService (Figure 7): every state-changing action writes one row (FR16).
const { AuditLog } = require('../models');

// actorId is null when the system acts on its own (e.g. the nightly job).
// Pass `transaction` so the audit row is saved or rolled back together with the change it describes.
async function log({ actorId = null, action, entityType, entityId = null, reason = null }, { transaction } = {}) {
  return AuditLog.create(
    { actor_id: actorId, action, entity_type: entityType, entity_id: entityId, reason },
    { transaction }
  );
}

module.exports = { log };

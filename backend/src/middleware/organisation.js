// Finds the signed-in user's nursery or institution and checks its approval (FR02:
// nothing can be recorded, published or requested before an administrator approves it).
const { Nursery, Institution } = require('../models');
const HttpError = require('../utils/httpError');

// Puts the operator's nursery on req.nursery. Use after requireRole('operator').
async function loadNursery(req, res, next) {
  try {
    // One nursery per operator in the UI (the model allows more, see docs/DEVIATIONS.md W6)
    req.nursery = await Nursery.findOne({ where: { owner_id: req.user.id }, order: [['id', 'ASC']] });
    if (!req.nursery) return next(new HttpError(404, 'NOT_FOUND', 'No nursery found for this account'));
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireApprovedNursery(req, res, next) {
  if (req.nursery?.verification_status !== 'approved') {
    return next(new HttpError(403, 'NOT_APPROVED', 'Your nursery must be approved by the administrator first'));
  }
  return next();
}

// Puts the institution profile on req.institution. Use after requireRole('institution').
async function loadInstitution(req, res, next) {
  try {
    req.institution = await Institution.findOne({ where: { user_id: req.user.id } });
    if (!req.institution) return next(new HttpError(404, 'NOT_FOUND', 'No institution found for this account'));
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireApprovedInstitution(req, res, next) {
  if (req.institution?.verification_status !== 'approved') {
    return next(new HttpError(403, 'NOT_APPROVED', 'Your institution must be approved by the administrator first'));
  }
  return next();
}

module.exports = { loadNursery, requireApprovedNursery, loadInstitution, requireApprovedInstitution };

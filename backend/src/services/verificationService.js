// Account verification (FR02, FR15): the administrator approves or rejects nurseries and
// institutions; the owner can correct rejected details and send them again.
const { sequelize, User, Nursery, Institution, UploadedFile } = require('../models');
const HttpError = require('../utils/httpError');
const audit = require('./auditService');
const { sendEmail } = require('./emailService');
const { render } = require('./emailTemplates');

const MODELS = { nursery: Nursery, institution: Institution };

// The owner account is linked differently for each type.
const ownerInclude = {
  nursery: { model: User, as: 'owner', attributes: ['id', 'full_name', 'email', 'phone', 'preferred_language'] },
  institution: { model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'phone', 'preferred_language'] },
};

async function documentsFor(type, id) {
  return UploadedFile.findAll({
    where: { entity_type: type, entity_id: id, purpose: 'verification_document' },
    attributes: ['id', 'original_name', 'mime_type', 'size_bytes', 'created_at'],
    order: [['created_at', 'DESC']],
  });
}

// Turns a nursery or institution row into one shape for the admin screen.
function toItem(type, row, documents = []) {
  const owner = type === 'nursery' ? row.owner : row.user;
  return {
    type,
    id: row.id,
    name: type === 'nursery' ? row.name : row.org_name,
    org_type: type === 'institution' ? row.org_type : null,
    district: row.district,
    sector: row.sector,
    address_text: type === 'nursery' ? row.address_text : null,
    contact_phone: type === 'institution' ? row.contact_phone : owner?.phone || null,
    verification_status: row.verification_status,
    review_note: row.review_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner: owner ? { id: owner.id, full_name: owner.full_name, email: owner.email, phone: owner.phone } : null,
    documents,
  };
}

async function list({ status = 'pending', type = 'all' } = {}) {
  const types = type === 'all' ? ['nursery', 'institution'] : [type];
  const items = [];
  for (const t of types) {
    const rows = await MODELS[t].findAll({
      where: status === 'all' ? {} : { verification_status: status },
      include: [ownerInclude[t]],
      order: [['updated_at', 'ASC']],
    });
    rows.forEach((row) => items.push(toItem(t, row)));
  }
  // Oldest waiting first, so nobody waits forever
  items.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

  const counts = {};
  for (const s of ['pending', 'approved', 'rejected']) {
    counts[s] = (await Nursery.count({ where: { verification_status: s } })) +
      (await Institution.count({ where: { verification_status: s } }));
  }
  return { items, counts };
}

async function getOne(type, id) {
  const row = await MODELS[type].findByPk(id, { include: [ownerInclude[type]] });
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Not found');
  return toItem(type, row, await documentsFor(type, id));
}

// Approve or reject. Only items that are waiting ("pending") can be decided.
async function decide({ adminId, type, id, decision, reason }) {
  let row;
  await sequelize.transaction(async (transaction) => {
    // Row lock: two administrators clicking at the same time cannot both decide.
    row = await MODELS[type].findByPk(id, { include: [ownerInclude[type]], transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Not found');
    if (row.verification_status !== 'pending') {
      throw new HttpError(409, 'ALREADY_DECIDED', 'This item has already been decided');
    }
    const approved = decision === 'approve';
    await row.update(
      { verification_status: approved ? 'approved' : 'rejected', review_note: approved ? null : reason },
      { transaction }
    );
    await audit.log(
      {
        actorId: adminId,
        action: approved ? 'verification.approved' : 'verification.rejected',
        entityType: type,
        entityId: row.id,
        reason: reason || null,
      },
      { transaction }
    );
  });

  const owner = type === 'nursery' ? row.owner : row.user;
  const orgName = type === 'nursery' ? row.name : row.org_name;
  const template = decision === 'approve' ? 'verificationApproved' : 'verificationRejected';
  const { subject, text } = render(template, owner.preferred_language, { name: owner.full_name, orgName, reason });
  await sendEmail({ to: owner.email, subject, text });

  return getOne(type, id);
}

// The organisation (nursery or institution) that belongs to a user, with its type.
async function findOwnOrganisation(user) {
  if (user.role === 'operator') {
    // One nursery per operator in the UI; the model allows more (see docs/DEVIATIONS.md).
    const nursery = await Nursery.findOne({ where: { owner_id: user.id }, order: [['id', 'ASC']] });
    return nursery ? { type: 'nursery', row: nursery } : null;
  }
  if (user.role === 'institution') {
    const institution = await Institution.findOne({ where: { user_id: user.id } });
    return institution ? { type: 'institution', row: institution } : null;
  }
  return null;
}

function toOwnOrganisation({ type, row }) {
  const base = {
    type,
    id: row.id,
    district: row.district,
    sector: row.sector,
    verification_status: row.verification_status,
    review_note: row.review_note,
  };
  if (type === 'nursery') {
    return { ...base, name: row.name, address_text: row.address_text, is_listed: row.is_listed, latitude: row.latitude, longitude: row.longitude };
  }
  return { ...base, name: row.org_name, org_type: row.org_type, contact_phone: row.contact_phone };
}

// The owner edits details. A rejected item goes back to "pending" so the administrator reviews it again.
async function updateOwnOrganisation(user, data) {
  const org = await findOwnOrganisation(user);
  if (!org) throw new HttpError(404, 'NOT_FOUND', 'No organisation found for this account');

  const changes = { district: data.district, sector: data.sector?.trim() };
  if (org.type === 'nursery') {
    Object.assign(changes, { name: data.name?.trim(), address_text: data.address_text ?? org.row.address_text });
    if (typeof data.is_listed === 'boolean') changes.is_listed = data.is_listed;
  } else {
    Object.assign(changes, {
      org_name: data.name?.trim(),
      org_type: data.org_type,
      contact_phone: data.contact_phone ?? org.row.contact_phone,
    });
  }
  // Remove fields that were not sent
  Object.keys(changes).forEach((k) => changes[k] === undefined && delete changes[k]);

  const resubmitted = org.row.verification_status === 'rejected';
  if (resubmitted) changes.verification_status = 'pending';

  await sequelize.transaction(async (transaction) => {
    await org.row.update(changes, { transaction });
    await audit.log(
      {
        actorId: user.id,
        action: resubmitted ? 'verification.resubmitted' : `${org.type}.updated`,
        entityType: org.type,
        entityId: org.row.id,
      },
      { transaction }
    );
  });
  return toOwnOrganisation(org);
}

module.exports = { list, getOne, decide, findOwnOrganisation, toOwnOrganisation, updateOwnOrganisation, documentsFor };

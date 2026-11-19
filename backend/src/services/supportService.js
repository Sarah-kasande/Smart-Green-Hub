// SupportService: help requests to the administrator (docs/DEVIATIONS.md W51).
//
// Who sends:   a signed-in nursery operator or institution (from "Help"), or a visitor through the public
//              contact form (no account; user_id NULL). The sender's name, email, role and organisation
//              are copied onto the ticket automatically.
// Statuses:    open -> in_progress -> resolved. The sender can reopen a resolved ticket within 14 days
//              (SUPPORT_REOPEN_DAYS) and may answer "Was this solved?" (yes / no).
// Messages:    a thread between the sender and the administrator. Internal notes (internal = true) are
//              seen by administrators only. An optional screenshot is an uploaded file (PNG/JPEG, max 5 MB)
//              that only its owner and administrators can open.
// Privacy:     a user sees only their own tickets; administrators see all; nothing is public.
// Offline:     the app sends tickets and replies with a client_uuid; the same uuid twice returns the
//              first record (idempotent), so a repeated send never creates a duplicate.
// Notifications go through the existing outbox (in-app + email). Every administrator action is audited.
// Tickets are never deleted, also when the account is archived.
const { Op } = require('sequelize');
const { sequelize, User, UploadedFile, SupportTicket, SupportMessage } = require('../models');
const HttpError = require('../utils/httpError');
const audit = require('./auditService');
const { notify, dispatchSoon } = require('./notificationService');
const { findOwnOrganisation } = require('./verificationService');
const { SUPPORT_REOPEN_DAYS } = require('../utils/constants');
const { DAY_MS } = require('../utils/dates');
const { likeOp } = require('../utils/sqlDialect');

const helpPath = (role) => (role === 'institution' ? '/institution/help' : '/operator/help');

// ---------- shared helpers ----------

async function notifyAdmins(type, payload, eventKey, transaction) {
  const admins = await User.findAll({ where: { role: 'admin', status: 'active' }, transaction });
  for (const admin of admins) {
    await notify({ userId: admin.id, type, eventKey: `${eventKey}:admin:${admin.id}`, payload }, { transaction });
  }
}

// A screenshot uploaded before the ticket was sent is attached to its first message. It must belong to
// the sender, be a support screenshot and not be attached to anything yet (entity_id 0).
async function attachScreenshot(user, fileId, message, transaction) {
  if (!fileId) return null;
  const file = await UploadedFile.findByPk(fileId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!file || file.owner_user_id !== user.id || file.purpose !== 'support_screenshot' || file.entity_id !== 0) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Unknown screenshot', { fields: { attachment_file_id: 'invalid' } });
  }
  await file.update({ entity_type: 'support_message', entity_id: message.id }, { transaction });
  await message.update({ attachment_file_id: file.id }, { transaction });
  return file;
}

function messageJson(m) {
  return {
    id: m.id,
    body: m.body,
    from_admin: m.from_admin,
    internal: m.internal,
    author: m.author ? { full_name: m.author.full_name } : null,
    attachment: m.attachment ? { id: m.attachment.id, original_name: m.attachment.original_name, mime_type: m.attachment.mime_type } : null,
    created_at: m.created_at,
  };
}

function canReopen(ticket, now = Date.now()) {
  return ticket.status === 'resolved' && ticket.resolved_at && now - new Date(ticket.resolved_at).getTime() <= SUPPORT_REOPEN_DAYS * DAY_MS;
}

// viewer: 'user' (internal notes removed) or 'admin' (everything)
function ticketJson(ticket, viewer, messages = null) {
  const json = {
    id: ticket.id,
    category: ticket.category,
    subject: ticket.subject,
    status: ticket.status,
    created_at: ticket.created_at,
    last_message_at: ticket.last_message_at,
    resolved_at: ticket.resolved_at,
    solved_feedback: ticket.solved_feedback,
    can_reopen: viewer === 'user' ? canReopen(ticket) : undefined,
    requester: {
      name: ticket.requester_name,
      email: ticket.requester_email,
      role: ticket.requester_role,
      organisation: ticket.organisation_name,
    },
  };
  if (viewer === 'admin') {
    json.user_id = ticket.user_id;
    json.resolved_by = ticket.resolvedBy ? { full_name: ticket.resolvedBy.full_name } : null;
  }
  if (messages) json.messages = messages.filter((m) => viewer === 'admin' || !m.internal).map(messageJson);
  return json;
}

const messageIncludes = [
  { model: User, as: 'author', attributes: ['id', 'full_name'], paranoid: false },
  { model: UploadedFile, as: 'attachment', attributes: ['id', 'original_name', 'mime_type'], paranoid: false },
];

async function threadOf(ticket, transaction) {
  return SupportMessage.findAll({ where: { ticket_id: ticket.id }, include: messageIncludes, order: [['created_at', 'ASC'], ['id', 'ASC']], transaction });
}

// ---------- signed-in users (operator, institution) ----------

async function createTicket(user, { client_uuid: clientUuid, category, subject, message, attachment_file_id: fileId }) {
  const result = await sequelize.transaction(async (transaction) => {
    // Offline: the same ticket sent twice -> the first one
    if (clientUuid) {
      const existing = await SupportTicket.findOne({ where: { client_uuid: clientUuid }, transaction });
      if (existing) {
        if (existing.user_id !== user.id) throw new HttpError(409, 'DUPLICATE', 'This record already exists');
        return { ticket: existing, duplicate: true };
      }
    }
    const org = await findOwnOrganisation(user);
    const now = new Date();
    const ticket = await SupportTicket.create(
      {
        client_uuid: clientUuid || null,
        user_id: user.id,
        requester_role: user.role,
        requester_name: user.full_name,
        requester_email: user.email,
        organisation_name: org ? (org.type === 'nursery' ? org.row.name : org.row.org_name) : null,
        category,
        subject,
        status: 'open',
        last_message_at: now,
      },
      { transaction }
    );
    const first = await SupportMessage.create({ ticket_id: ticket.id, author_user_id: user.id, body: message }, { transaction });
    await attachScreenshot(user, fileId, first, transaction);
    await audit.log({ actorId: user.id, action: 'support.ticket_created', entityType: 'support_ticket', entityId: ticket.id, reason: category }, { transaction });
    await notifyAdmins(
      'support_ticket_created',
      { ticket_id: ticket.id, subject, category, from: ticket.organisation_name || user.full_name, role: user.role },
      `support:ticket:${ticket.id}`,
      transaction
    );
    return { ticket, duplicate: false };
  });
  dispatchSoon();
  return { ticket: await getOwn(result.ticket.user_id, result.ticket.id), duplicate: result.duplicate };
}

async function listOwn(user) {
  const tickets = await SupportTicket.findAll({ where: { user_id: user.id }, order: [['last_message_at', 'DESC'], ['id', 'DESC']], limit: 200 });
  return tickets.map((t) => ticketJson(t, 'user'));
}

// Anyone else's ticket answers "not found", so it does not even reveal that it exists
async function findOwn(userId, ticketId, transaction) {
  const ticket = await SupportTicket.findOne({ where: { id: ticketId, user_id: userId }, transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (!ticket) throw new HttpError(404, 'NOT_FOUND', 'Not found');
  return ticket;
}

async function getOwn(userId, ticketId) {
  const ticket = await findOwn(userId, ticketId);
  return ticketJson(ticket, 'user', await threadOf(ticket));
}

async function replyAsUser(user, ticketId, { client_uuid: clientUuid, message, attachment_file_id: fileId }) {
  await sequelize.transaction(async (transaction) => {
    if (clientUuid && (await SupportMessage.findOne({ where: { client_uuid: clientUuid }, transaction }))) return; // sent before
    const ticket = await findOwn(user.id, ticketId, transaction);
    if (ticket.status === 'resolved') throw new HttpError(409, 'TICKET_RESOLVED', 'This request is resolved. Reopen it to write again.');
    const reply = await SupportMessage.create({ ticket_id: ticket.id, author_user_id: user.id, body: message, client_uuid: clientUuid || null }, { transaction });
    await attachScreenshot(user, fileId, reply, transaction);
    await ticket.update({ last_message_at: new Date() }, { transaction });
    await notifyAdmins('support_user_replied', { ticket_id: ticket.id, subject: ticket.subject, from: ticket.organisation_name || ticket.requester_name }, `support:message:${reply.id}`, transaction);
  });
  dispatchSoon();
  return getOwn(user.id, ticketId);
}

// The sender reopens a resolved ticket within 14 days (optionally with a message)
async function reopen(user, ticketId, { message } = {}) {
  await sequelize.transaction(async (transaction) => {
    const ticket = await findOwn(user.id, ticketId, transaction);
    if (ticket.status !== 'resolved') throw new HttpError(409, 'NOT_RESOLVED', 'This request is still open');
    if (!canReopen(ticket)) throw new HttpError(409, 'REOPEN_EXPIRED', `A request can be reopened within ${SUPPORT_REOPEN_DAYS} days of being resolved`);
    await ticket.update({ status: 'open', resolved_at: null, resolved_by: null, solved_feedback: null, last_message_at: new Date() }, { transaction });
    let key = `support:reopened:${ticket.id}:${Date.now()}`;
    if (message) {
      const reply = await SupportMessage.create({ ticket_id: ticket.id, author_user_id: user.id, body: message }, { transaction });
      key = `support:message:${reply.id}`;
    }
    await audit.log({ actorId: user.id, action: 'support.reopened', entityType: 'support_ticket', entityId: ticket.id }, { transaction });
    await notifyAdmins('support_reopened', { ticket_id: ticket.id, subject: ticket.subject, from: ticket.organisation_name || ticket.requester_name }, key, transaction);
  });
  dispatchSoon();
  return getOwn(user.id, ticketId);
}

// Optional "Was this solved?" after resolution
async function feedback(user, ticketId, solved) {
  const ticket = await findOwn(user.id, ticketId);
  if (ticket.status !== 'resolved') throw new HttpError(409, 'NOT_RESOLVED', 'This request is not resolved yet');
  await ticket.update({ solved_feedback: solved ? 'yes' : 'no' });
  return getOwn(user.id, ticketId);
}

// ---------- public contact form (no account) ----------

// The honeypot field ("website") is hidden from people; a robot that fills it gets the same friendly
// answer, but nothing is saved. Rate limiting is done on the route.
async function createPublicTicket({ name, email, message, website }) {
  if (website) return { accepted: true, saved: false };
  const now = new Date();
  await sequelize.transaction(async (transaction) => {
    const ticket = await SupportTicket.create(
      {
        user_id: null,
        requester_role: 'public',
        requester_name: name,
        requester_email: email,
        category: 'other',
        subject: message.split('\n')[0].slice(0, 80) || 'Contact form',
        status: 'open',
        last_message_at: now,
      },
      { transaction }
    );
    await SupportMessage.create({ ticket_id: ticket.id, body: message }, { transaction });
    await audit.log({ actorId: null, action: 'support.public_message', entityType: 'support_ticket', entityId: ticket.id }, { transaction });
    await notifyAdmins('support_ticket_created', { ticket_id: ticket.id, subject: ticket.subject, category: 'other', from: name, role: 'public' }, `support:ticket:${ticket.id}`, transaction);
  });
  dispatchSoon();
  return { accepted: true, saved: true };
}

// ---------- administrator ----------

async function adminList({ status, category, role, q } = {}) {
  const where = {};
  if (status && status !== 'all') where.status = status;
  if (category) where.category = category;
  if (role) where.requester_role = role;
  if (q && q.trim()) {
    const like = `%${q.trim().replace(/[\\%_]/g, '\\$&')}%`;
    where[Op.or] = [{ subject: { [likeOp()]: like } }, { requester_name: { [likeOp()]: like } }, { requester_email: { [likeOp()]: like } }, { organisation_name: { [likeOp()]: like } }];
  }
  const tickets = await SupportTicket.findAll({ where, order: [['created_at', 'DESC'], ['id', 'DESC']], limit: 500 });
  const counts = { open: 0, in_progress: 0, resolved: 0 };
  const rows = await SupportTicket.findAll({ attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'n']], group: ['status'], raw: true });
  for (const r of rows) counts[r.status] = Number(r.n);
  counts.all = counts.open + counts.in_progress + counts.resolved;
  return { items: tickets.map((t) => ticketJson(t, 'admin')), counts };
}

// The number on the "Support" menu item: tickets waiting for a first look
async function openCount() {
  return SupportTicket.count({ where: { status: 'open' } });
}

async function findAny(ticketId, transaction) {
  const ticket = await SupportTicket.findByPk(ticketId, {
    include: [{ model: User, as: 'resolvedBy', attributes: ['id', 'full_name'], paranoid: false }],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!ticket) throw new HttpError(404, 'NOT_FOUND', 'Not found');
  return ticket;
}

async function adminGet(ticketId) {
  const ticket = await findAny(ticketId);
  return ticketJson(ticket, 'admin', await threadOf(ticket));
}

// A reply (the sender is told) or an internal note (administrators only, nobody is told).
// A visitor from the public contact form has no account, so the administrator answers them by email;
// only internal notes can be added to those tickets.
async function adminReply(admin, ticketId, { message, internal }) {
  await sequelize.transaction(async (transaction) => {
    const ticket = await findAny(ticketId, transaction);
    if (!internal && !ticket.user_id) throw new HttpError(409, 'PUBLIC_TICKET', 'Answer this visitor by email');
    const reply = await SupportMessage.create({ ticket_id: ticket.id, author_user_id: admin.id, from_admin: true, internal: Boolean(internal), body: message }, { transaction });
    if (!internal) {
      // The first answer moves a new ticket to "in progress"
      await ticket.update({ last_message_at: new Date(), status: ticket.status === 'open' ? 'in_progress' : ticket.status }, { transaction });
      await notify(
        {
          userId: ticket.user_id,
          type: 'support_admin_replied',
          eventKey: `support:message:${reply.id}:user:${ticket.user_id}`,
          payload: { ticket_id: ticket.id, subject: ticket.subject, path: helpPath(ticket.requester_role) },
        },
        { transaction }
      );
    }
    await audit.log({ actorId: admin.id, action: internal ? 'support.note_added' : 'support.replied', entityType: 'support_ticket', entityId: ticket.id }, { transaction });
  });
  dispatchSoon();
  return adminGet(ticketId);
}

async function adminSetStatus(admin, ticketId, status) {
  await sequelize.transaction(async (transaction) => {
    const ticket = await findAny(ticketId, transaction);
    if (ticket.status === status) return;
    const changes = { status };
    if (status === 'resolved') Object.assign(changes, { resolved_at: new Date(), resolved_by: admin.id, solved_feedback: null });
    else Object.assign(changes, { resolved_at: null, resolved_by: null });
    await ticket.update(changes, { transaction });
    const logRow = await audit.log({ actorId: admin.id, action: 'support.status_changed', entityType: 'support_ticket', entityId: ticket.id, reason: status }, { transaction });
    if (status === 'resolved' && ticket.user_id) {
      await notify(
        {
          userId: ticket.user_id,
          type: 'support_resolved',
          eventKey: `audit:${logRow.id}:user:${ticket.user_id}`,
          payload: { ticket_id: ticket.id, subject: ticket.subject, path: helpPath(ticket.requester_role), days: SUPPORT_REOPEN_DAYS },
        },
        { transaction }
      );
    }
  });
  dispatchSoon();
  return adminGet(ticketId);
}

module.exports = {
  canReopen,
  ticketJson,
  createTicket,
  listOwn,
  getOwn,
  replyAsUser,
  reopen,
  feedback,
  createPublicTicket,
  adminList,
  openCount,
  adminGet,
  adminReply,
  adminSetStatus,
};

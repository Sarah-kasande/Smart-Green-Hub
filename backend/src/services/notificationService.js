// NotificationService (Figure 7, FR14): a persistent outbox.
//
// notify() writes ONE row per event and recipient. The unique event_key (e.g. "alert:12:user:4")
// means the same event can never be queued twice for the same person.
// The row is the in-app notification. dispatchPending() then sends the email for each row and
// records the result: "sent", or "failed" with the error and the number of attempts. Failed rows
// are retried (up to MAX_ATTEMPTS) by the scheduled job and stay visible to the administrator.
const { Op } = require('sequelize');
const { Notification, User } = require('../models');
const { isTest } = require('../config/env');
const { sendEmail } = require('./emailService');
const { renderNotification } = require('./emailTemplates');

const MAX_ATTEMPTS = 5;

async function notify({ userId, type, eventKey, payload }, { transaction } = {}) {
  const [row] = await Notification.findOrCreate({
    where: { event_key: eventKey },
    defaults: { user_id: userId, type, payload_json: payload, status: 'pending' },
    transaction,
  });
  return row;
}

// Sends the emails of waiting notifications. Called right after an action and every few minutes.
let running = false;
async function dispatchPending({ limit = 50 } = {}) {
  if (running) return { sent: 0, failed: 0 };
  running = true;
  let sent = 0;
  let failed = 0;
  try {
    const rows = await Notification.findAll({
      where: {
        [Op.or]: [{ status: 'pending' }, { status: 'failed', attempts: { [Op.lt]: MAX_ATTEMPTS } }],
      },
      include: [{ model: User, as: 'user' }],
      order: [['id', 'ASC']],
      limit,
    });
    for (const row of rows) {
      const message = row.user ? renderNotification(row.type, row.user.preferred_language, row.payload_json || {}) : null;
      if (!message) {
        await row.update({ status: 'failed', attempts: MAX_ATTEMPTS, last_error: 'No recipient or no email template' });
        failed++;
        continue;
      }
      let result;
      try {
        result = await sendEmail({ to: row.user.email, ...message });
      } catch (error) {
        result = { delivered: false, error: error.message };
      }
      // In development and tests the email is printed or captured instead of sent: that counts as done.
      if (result.delivered || result.printed || result.captured) {
        await row.update({ status: 'sent', sent_at: new Date(), attempts: row.attempts + 1, last_error: null });
        sent++;
      } else {
        await row.update({ status: 'failed', attempts: row.attempts + 1, last_error: (result.error || 'Email provider refused or is not configured').slice(0, 500) });
        failed++;
      }
    }
  } finally {
    running = false;
  }
  return { sent, failed };
}

// Fire-and-forget dispatch after a request finished (not in tests, where tests call it directly).
function dispatchSoon() {
  if (isTest) return;
  setImmediate(() => dispatchPending().catch((e) => console.error('Notification dispatch failed:', e.message)));
}

async function listForUser(userId, { limit = 50 } = {}) {
  const items = await Notification.findAll({ where: { user_id: userId }, order: [['id', 'DESC']], limit });
  const unread = await Notification.count({ where: { user_id: userId, read_at: null } });
  return { items: items.map(toJson), unread };
}

function toJson(n) {
  return { id: n.id, type: n.type, payload: n.payload_json, read_at: n.read_at, created_at: n.created_at, email_status: n.status };
}

async function markRead(userId, id) {
  const where = { user_id: userId, read_at: null };
  if (id) where.id = id;
  await Notification.update({ read_at: new Date() }, { where });
}

module.exports = { MAX_ATTEMPTS, notify, dispatchPending, dispatchSoon, listForUser, markRead };

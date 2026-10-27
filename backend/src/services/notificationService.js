// NotificationService (Figure 7, FR14): the outbox for EVERY email (docs/DEVIATIONS.md W20).
//
// Each email is one row with a truthful status:
//   queued   waiting to be sent
//   sent     Brevo accepted it
//   failed   Brevo refused it or could not be reached; last_error holds Brevo's exact answer
//   skipped  not sent on purpose: development/tests without BREVO_API_KEY (printed to the console)
//
// Two kinds of rows:
//   notifications (alerts, requests, ...): notify() queues a row, dispatchPending() renders the
//     email from the stored details and sends it; failed ones are retried up to MAX_ATTEMPTS times.
//     These rows are also the in-app notifications (in_app = true).
//   one-time codes (verify_code, reset_code) and the password-changed email: sendNow() records the
//     row and sends at once. The code itself is never stored, so a failed code email cannot be resent
//     as it was: "Retry" issues a NEW code instead (adminService.retryEmail). in_app = false.
// The unique event_key (e.g. "alert:12") means the same event is never queued twice for a person.
const { Op } = require('sequelize');
const { waitUntil } = require('@vercel/functions');
const { Notification, User } = require('../models');
const { isTest } = require('../config/env');
const { sendEmail, maskEmail } = require('./emailService');
const { renderNotification } = require('./emailTemplates');

const MAX_ATTEMPTS = 5;
// Emails whose content (a one-time code) is not stored: never re-rendered from the outbox
const CODE_TYPES = ['verify_code', 'reset_code'];

// Sends the email of one outbox row and saves the result on the row.
async function deliver(row, recipient, message) {
  let result;
  try {
    result = await sendEmail({ to: recipient, ...message });
  } catch (error) {
    result = { status: 'failed', error: error.message };
  }
  await row.update({
    status: result.status,
    attempts: row.attempts + 1,
    sent_at: result.status === 'sent' ? new Date() : row.sent_at,
    last_error: result.error ? String(result.error).slice(0, 500) : null,
    recipient_email: recipient,
  });
  return result;
}

// Queues a notification (in-app + email). Sent by dispatchPending().
async function notify({ userId, type, eventKey, payload }, { transaction } = {}) {
  const [row] = await Notification.findOrCreate({
    where: { event_key: eventKey },
    defaults: { user_id: userId, type, payload_json: payload, status: 'queued', in_app: true },
    transaction,
  });
  return row;
}

// Records an email in the outbox and sends it immediately (codes, password changed).
// `payload` must never contain the code: only harmless details are stored.
async function sendNow({ user, type, eventKey, message, payload = {} }) {
  const row = await Notification.create({
    user_id: user.id,
    event_key: eventKey,
    type,
    payload_json: payload,
    status: 'queued',
    in_app: false,
    recipient_email: user.email,
  });
  const result = await deliver(row, user.email, message);
  return { row, result };
}

// Sends queued notification emails and retries failed ones. Runs after actions and every 5 minutes.
let running = false;
async function dispatchPending({ limit = 50 } = {}) {
  if (running) return { sent: 0, failed: 0, skipped: 0 };
  running = true;
  const counts = { sent: 0, failed: 0, skipped: 0 };
  try {
    const rows = await Notification.findAll({
      where: {
        type: { [Op.notIn]: CODE_TYPES },
        [Op.or]: [{ status: 'queued' }, { status: 'failed', attempts: { [Op.lt]: MAX_ATTEMPTS } }],
      },
      include: [{ model: User, as: 'user' }],
      order: [['id', 'ASC']],
      limit,
    });
    for (const row of rows) {
      const message = row.user ? renderNotification(row.type, row.user.preferred_language, row.payload_json || {}) : null;
      if (!message) {
        await row.update({ status: 'failed', attempts: MAX_ATTEMPTS, last_error: 'No recipient or no email template' });
        counts.failed++;
        continue;
      }
      const result = await deliver(row, row.user.email, message);
      counts[result.status]++;
    }
  } finally {
    running = false;
  }
  return counts;
}

// Fire-and-forget dispatch after a request finished (not in tests, where tests call it directly).
// On Vercel the function may be paused as soon as the answer is sent, so waitUntil keeps it
// running until the emails are sent. Elsewhere (local, Render) the server keeps running anyway.
function dispatchSoon() {
  if (isTest) return;
  const work = new Promise((resolve) => setImmediate(resolve))
    .then(dispatchPending)
    .catch((e) => console.error('Notification dispatch failed:', e.message));
  if (process.env.VERCEL) waitUntil(work);
}

// ---- In-app notifications (only rows with in_app = true) ----

async function listForUser(userId, { limit = 50 } = {}) {
  const items = await Notification.findAll({ where: { user_id: userId, in_app: true }, order: [['id', 'DESC']], limit });
  const unread = await Notification.count({ where: { user_id: userId, in_app: true, read_at: null } });
  return { items: items.map(toJson), unread };
}

function toJson(n) {
  return { id: n.id, type: n.type, payload: n.payload_json, read_at: n.read_at, created_at: n.created_at, email_status: n.status };
}

async function markRead(userId, id) {
  const where = { user_id: userId, in_app: true, read_at: null };
  if (id) where.id = id;
  await Notification.update({ read_at: new Date() }, { where });
}

// ---- Email report for the administrator ----

// Counts by status and the emails that were NOT delivered (failed and skipped), newest first.
async function emailReport({ limit = 200 } = {}) {
  const counts = { queued: 0, sent: 0, failed: 0, skipped: 0 };
  const grouped = await Notification.findAll({
    attributes: ['status', [Notification.sequelize.fn('COUNT', Notification.sequelize.col('id')), 'n']],
    group: ['status'],
    raw: true,
  });
  grouped.forEach((g) => (counts[g.status] = Number(g.n)));

  const rows = await Notification.findAll({
    where: { status: { [Op.in]: ['failed', 'skipped'] } },
    include: [{ model: User, as: 'user', attributes: ['email'] }],
    order: [['updated_at', 'DESC']],
    limit,
  });
  const items = rows.map((r) => ({
    id: r.id,
    time: r.updated_at,
    type: r.type,
    status: r.status,
    recipient: maskEmail(r.recipient_email || r.user?.email),
    attempts: r.attempts,
    error: r.last_error,
    retry_issues_new_code: CODE_TYPES.includes(r.type),
  }));
  return { counts, items };
}

module.exports = {
  MAX_ATTEMPTS,
  CODE_TYPES,
  notify,
  sendNow,
  deliver,
  dispatchPending,
  dispatchSoon,
  listForUser,
  markRead,
  emailReport,
};

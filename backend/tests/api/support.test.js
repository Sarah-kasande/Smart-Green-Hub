// Help requests (docs/DEVIATIONS.md W51): permissions and privacy, screenshots, the status flow with
// reopening, notifications, idempotent (offline) sending, the public contact form with its limits, and
// tickets of archived accounts being kept.
// Runs ONLY against the local test database (tests/guard.js refuses the live one). Fake accounts only.
const crypto = require('crypto');
const h = require('../helpers');
const { SupportTicket, SupportMessage, Notification, AuditLog, User } = require('../../src/models');

// A real 1x1 PNG (the server checks the file content, not only the name)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n%test\n');

let admin;
let adminUser;
let op;
let opData;
let school;
let schoolData;
let schoolId;
let ticketId;

const ask = (client, body = {}) => client.post('/api/support/tickets').send({ category: 'batches', subject: 'Cannot edit my batch', message: 'The save button does nothing.', ...body });
const upload = (client, buffer, type) => client.post('/api/uploads/support-screenshots').set('Content-Type', type).set('X-File-Name', 'shot.png').send(buffer);
const notes = (userId, type) => Notification.count({ where: { user_id: userId, type } });

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  adminUser = await User.findOne({ where: { role: 'admin' } });
  opData = h.operatorData(h.uniqueEmail('help-op'), { nursery: { name: 'Help Nursery', district: 'Kicukiro', sector: 'Kanombe' } });
  op = (await h.approvedUser(admin, opData)).client;
  schoolData = h.institutionData(h.uniqueEmail('help-school'), { institution: { org_name: 'Help School', org_type: 'school', district: 'Gasabo', sector: 'Remera' } });
  const s = await h.approvedUser(admin, schoolData);
  school = s.client;
  schoolId = s.id;
});
afterAll(() => h.sequelize.close());

describe('permissions and privacy', () => {
  test('only signed-in nurseries and institutions use Help; only the administrator uses Support', async () => {
    const anonymous = await h.newClient();
    expect((await anonymous.get('/api/support/tickets')).status).toBe(401);
    expect((await admin.get('/api/support/tickets')).status).toBe(403);
    for (const path of ['/api/admin/support', '/api/admin/support/count']) {
      expect((await op.get(path)).status).toBe(403);
      expect((await anonymous.get(path)).status).toBe(401);
    }
  });

  test('an account still waiting for approval can ask for help', async () => {
    const waiting = await h.registerVerifiedUser(h.operatorData(h.uniqueEmail('help-waiting'), { nursery: { name: 'Waiting Nursery', district: 'Gasabo', sector: 'Remera' } }));
    const res = await ask(waiting, { category: 'account', subject: 'When am I approved?' });
    expect(res.status).toBe(201);
    expect(res.body.ticket.requester).toMatchObject({ role: 'operator', organisation: 'Waiting Nursery' });
  });
});

describe('a help request from a nursery', () => {
  test('is saved with the sender attached automatically, audited, and the administrator is notified', async () => {
    const res = await ask(op);
    expect(res.status).toBe(201);
    ticketId = res.body.ticket.id;
    expect(res.body.ticket).toMatchObject({ status: 'open', category: 'batches', subject: 'Cannot edit my batch', requester: { name: opData.full_name, email: opData.email, role: 'operator', organisation: 'Help Nursery' } });
    expect(res.body.ticket.messages).toHaveLength(1);
    expect(await notes(adminUser.id, 'support_ticket_created')).toBeGreaterThanOrEqual(1);
    expect(await AuditLog.count({ where: { action: 'support.ticket_created', entity_id: ticketId } })).toBe(1);
    expect((await admin.get('/api/admin/support/count')).body.open).toBeGreaterThanOrEqual(1);
  });

  test('another user cannot see or answer it ("not found")', async () => {
    expect((await school.get(`/api/support/tickets/${ticketId}`)).status).toBe(404);
    expect((await school.post(`/api/support/tickets/${ticketId}/messages`).send({ message: 'Hello' })).status).toBe(404);
    expect((await school.get('/api/support/tickets')).body.tickets).toEqual([]);
  });

  test('sent twice with the same client_uuid (offline retry), it is saved once', async () => {
    const uuid = crypto.randomUUID();
    const first = await ask(op, { client_uuid: uuid, subject: 'Offline question' });
    const again = await ask(op, { client_uuid: uuid, subject: 'Offline question' });
    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ duplicate: true, ticket: { id: first.body.ticket.id } });
    expect(await SupportTicket.count({ where: { client_uuid: uuid } })).toBe(1);
    // The other user cannot claim that uuid
    expect((await ask(school, { client_uuid: uuid })).status).toBe(409);
  });

  test('a screenshot: images only, max 5 MB, attached once, visible only to its owner and the administrator', async () => {
    expect((await upload(op, PDF, 'application/pdf')).status).toBe(415);
    expect((await upload(op, Buffer.alloc(5 * 1024 * 1024 + 10, 1), 'image/png')).status).toBe(413);
    const file = (await upload(op, PNG, 'image/png')).body.file;
    // Someone else cannot attach it
    expect((await ask(school, { attachment_file_id: file.id })).status).toBe(400);
    const res = await ask(op, { subject: 'With a screenshot', attachment_file_id: file.id });
    expect(res.body.ticket.messages[0].attachment).toMatchObject({ id: file.id });
    // Already attached: cannot be used again
    expect((await ask(op, { subject: 'Again', attachment_file_id: file.id })).status).toBe(400);
    expect((await op.get(`/api/uploads/${file.id}`)).status).toBe(200);
    expect((await admin.get(`/api/uploads/${file.id}`)).status).toBe(200);
    expect((await school.get(`/api/uploads/${file.id}`)).status).toBe(404);
    expect((await (await h.newClient()).get(`/api/uploads/${file.id}`)).status).toBe(401);
  });

  test('invalid input is refused', async () => {
    expect((await ask(op, { category: 'payments' })).body.details.fields.category).toBe('invalid_choice');
    expect((await ask(op, { subject: '' })).body.details.fields.subject).toBe('required');
    expect((await ask(op, { message: 'x'.repeat(4001) })).body.details.fields.message).toBe('too_long');
  });
});

describe('the conversation and the status flow', () => {
  let owner;

  test('an administrator reply moves it to "in progress" and tells the user; an internal note stays hidden', async () => {
    owner = await User.findOne({ where: { email: opData.email } });
    const reply = await admin.post(`/api/admin/support/${ticketId}/messages`).send({ message: 'Which batch is it?' });
    expect(reply.status).toBe(201);
    expect(reply.body.ticket.status).toBe('in_progress');
    expect(await notes(owner.id, 'support_admin_replied')).toBe(1);

    await admin.post(`/api/admin/support/${ticketId}/messages`).send({ message: 'Probably the old app version', internal: true });
    expect(await notes(owner.id, 'support_admin_replied')).toBe(1); // nobody is told about a note
    const forUser = (await op.get(`/api/support/tickets/${ticketId}`)).body.ticket;
    expect(forUser.messages.map((m) => m.body)).toEqual(['The save button does nothing.', 'Which batch is it?']);
    expect(JSON.stringify(forUser)).not.toContain('old app version');
    const forAdmin = (await admin.get(`/api/admin/support/${ticketId}`)).body.ticket;
    expect(forAdmin.messages.filter((m) => m.internal)).toHaveLength(1);
    expect(await AuditLog.count({ where: { action: 'support.replied', entity_id: ticketId } })).toBe(1);
    expect(await AuditLog.count({ where: { action: 'support.note_added', entity_id: ticketId } })).toBe(1);
  });

  test('the user replies (once, even if sent twice) and the administrator is told', async () => {
    const before = await notes(adminUser.id, 'support_user_replied');
    const uuid = crypto.randomUUID();
    await op.post(`/api/support/tickets/${ticketId}/messages`).send({ message: 'Batch #3', client_uuid: uuid });
    await op.post(`/api/support/tickets/${ticketId}/messages`).send({ message: 'Batch #3', client_uuid: uuid });
    expect(await SupportMessage.count({ where: { client_uuid: uuid } })).toBe(1);
    expect(await notes(adminUser.id, 'support_user_replied')).toBe(before + 1);
  });

  test('resolved: the user is told, cannot reply, can say whether it was solved', async () => {
    const res = await admin.put(`/api/admin/support/${ticketId}/status`).send({ status: 'resolved' });
    expect(res.body.ticket).toMatchObject({ status: 'resolved', resolved_by: { full_name: adminUser.full_name } });
    expect(await notes(owner.id, 'support_resolved')).toBe(1);
    expect(await AuditLog.count({ where: { action: 'support.status_changed', entity_id: ticketId, reason: 'resolved' } })).toBe(1);
    expect((await op.post(`/api/support/tickets/${ticketId}/messages`).send({ message: 'Still broken' })).body.code).toBe('TICKET_RESOLVED');
    const fb = await op.post(`/api/support/tickets/${ticketId}/feedback`).send({ solved: true });
    expect(fb.body.ticket).toMatchObject({ solved_feedback: 'yes', can_reopen: true });
    expect((await admin.put(`/api/admin/support/${ticketId}/status`).send({ status: 'closed' })).status).toBe(400);
  });

  test('the user can reopen within 14 days, not after', async () => {
    const before = await notes(adminUser.id, 'support_reopened');
    const reopened = await op.post(`/api/support/tickets/${ticketId}/reopen`).send({ message: 'It came back' });
    expect(reopened.body.ticket).toMatchObject({ status: 'open', solved_feedback: null });
    expect(await notes(adminUser.id, 'support_reopened')).toBe(before + 1);
    expect((await op.post(`/api/support/tickets/${ticketId}/reopen`).send({})).body.code).toBe('NOT_RESOLVED');

    await admin.put(`/api/admin/support/${ticketId}/status`).send({ status: 'resolved' });
    await SupportTicket.update({ resolved_at: new Date(Date.now() - 15 * 86400000) }, { where: { id: ticketId } }); // local test database only
    expect((await op.get(`/api/support/tickets/${ticketId}`)).body.ticket.can_reopen).toBe(false);
    expect((await op.post(`/api/support/tickets/${ticketId}/reopen`).send({})).body.code).toBe('REOPEN_EXPIRED');
  });
});

describe('administrator list', () => {
  test('newest first, with counts and filters by status, category and role', async () => {
    await ask(school, { category: 'requests', subject: 'Where is my request?' });
    const all = (await admin.get('/api/admin/support')).body;
    expect(all.items[0].subject).toBe('Where is my request?');
    expect(all.counts.all).toBe(all.items.length);
    const ids = async (query) => (await admin.get(`/api/admin/support${query}`)).body.items.map((t) => t.requester.role);
    expect(new Set(await ids('?role=institution'))).toEqual(new Set(['institution']));
    expect((await admin.get('/api/admin/support?category=requests')).body.items.every((t) => t.category === 'requests')).toBe(true);
    expect((await admin.get('/api/admin/support?status=resolved')).body.items.map((t) => t.id)).toContain(ticketId);
    expect((await admin.get('/api/admin/support?q=Where%20is')).body.items).toHaveLength(1);
  });
});

describe('the public contact form', () => {
  test('saves a message without an account and tells the administrator', async () => {
    const visitor = await h.newClient();
    const res = await visitor.post('/api/public/contact').send({ name: 'A Visitor', email: 'visitor@example.test', message: 'I cannot sign in to my account.' });
    expect(res.status).toBe(201);
    const ticket = await SupportTicket.findOne({ where: { requester_email: 'visitor@example.test' } });
    expect(ticket.get({ plain: true })).toMatchObject({ user_id: null, requester_role: 'public', status: 'open' });
    // The administrator answers a visitor by email; only internal notes can be added
    expect((await admin.post(`/api/admin/support/${ticket.id}/messages`).send({ message: 'Hello' })).body.code).toBe('PUBLIC_TICKET');
    expect((await admin.post(`/api/admin/support/${ticket.id}/messages`).send({ message: 'Called them', internal: true })).status).toBe(201);
  });

  test('the honeypot: a robot that fills the hidden field gets the same answer, but nothing is saved', async () => {
    const before = await SupportTicket.count();
    const res = await (await h.newClient()).post('/api/public/contact').send({ name: 'Bot', email: 'bot@example.test', message: 'Buy cheap things now!!!', website: 'http://spam.example' });
    expect(res.status).toBe(201);
    expect(await SupportTicket.count()).toBe(before);
  });

  test('invalid input is refused', async () => {
    const visitor = await h.newClient();
    expect((await visitor.post('/api/public/contact').send({ name: 'A', email: 'not-an-email', message: 'Long enough message' })).body.details.fields.email).toBe('invalid_email');
    expect((await visitor.post('/api/public/contact').send({ name: 'A', email: 'a@example.test', message: 'short' })).body.details.fields.message).toBe('too_short');
  });

  test('is rate-limited to 5 messages per hour per address', async () => {
    process.env.TEST_RATE_LIMITS = 'on';
    try {
      const visitor = await h.newClient();
      const statuses = [];
      for (let i = 0; i < 6; i++) {
        statuses.push((await visitor.post('/api/public/contact').send({ name: 'Rate', email: `rate${i}@example.test`, message: 'Please help me with my account.' })).status);
      }
      expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
      expect(statuses[5]).toBe(429);
    } finally {
      delete process.env.TEST_RATE_LIMITS;
    }
  });
});

describe('tickets of archived accounts are kept', () => {
  test('archiving the institution keeps its tickets; deleting it is refused because of them', async () => {
    const before = (await admin.get('/api/admin/support?role=institution')).body.items.length;
    expect((await admin.post(`/api/admin/institutions/${schoolId}/archive`).send({ reason: 'Test archive' })).status).toBe(200);
    expect((await admin.get('/api/admin/support?role=institution')).body.items).toHaveLength(before);
    const del = await admin.agent.delete(`/api/admin/institutions/${schoolId}`).set('X-CSRF-Token', admin.csrf).send({ reason: 'Test' });
    expect(del.body).toMatchObject({ code: 'HAS_HISTORY', details: { links: { support_tickets: 1 } } });
  });
});

// One-time codes (docs/DEVIATIONS.md W21) and the email outbox statuses (W20).
const h = require('../helpers');
const { AuthToken, Notification } = require('../../src/models');
const otp = require('../../src/services/otpService');
const { dispatchPending, notify } = require('../../src/services/notificationService');

beforeAll(h.resetDatabase);
afterAll(() => h.sequelize.close());

let n = 0;
async function newAccount() {
  const email = `otp-${Date.now()}-${n++}@example.test`;
  const client = await h.newClient();
  const res = await client.post('/api/auth/register').send(h.operatorData(email));
  expect(res.status).toBe(201);
  return { client, email, code: h.lastCodeSentTo(email) };
}
const verify = (client, email, code) => client.post('/api/auth/verify-email').send({ email, code });
const wrongCodeFor = (code) => (code === '000000' ? '111111' : '000000');

describe('unit: code generation and hashing', () => {
  test('codes are 6 digits, including leading zeros, and vary', () => {
    const codes = new Set(Array.from({ length: 200 }, () => otp.generateCode()));
    for (const c of codes) expect(c).toMatch(/^\d{6}$/);
    expect(codes.size).toBeGreaterThan(190);
  });
  test('the hash depends on the user and the purpose, and hides the code', () => {
    const a = otp.hashCode(1, 'verify_email', '123456');
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toContain('123456');
    expect(otp.hashCode(2, 'verify_email', '123456')).not.toBe(a);
    expect(otp.hashCode(1, 'reset_password', '123456')).not.toBe(a);
  });
});

describe('verification codes', () => {
  test('correct code confirms the email', async () => {
    const { client, email, code } = await newAccount();
    expect((await verify(client, email, code)).status).toBe(200);
  });

  test('wrong code: clear error with attempts left', async () => {
    const { client, email, code } = await newAccount();
    const res = await verify(client, email, wrongCodeFor(code));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'WRONG_CODE', details: { attempts_left: 4 } });
    // The right code still works afterwards
    expect((await verify(client, email, code)).status).toBe(200);
  });

  test('a code that is not 6 digits is refused by validation', async () => {
    const { client, email } = await newAccount();
    const res = await verify(client, email, '12ab56');
    expect(res.body.details.fields.code).toBe('invalid_code');
  });

  test('expired code (older than 10 minutes)', async () => {
    const { client, email, code } = await newAccount();
    const row = await AuthToken.findOne({ order: [['id', 'DESC']] });
    expect(Math.round((new Date(row.expires_at) - new Date(row.created_at)) / 60000)).toBe(10);
    await row.update({ expires_at: new Date(Date.now() - 1000) });
    const res = await verify(client, email, code);
    expect(res.body.code).toBe('CODE_EXPIRED');
    // and it stays unusable
    expect((await verify(client, email, code)).body.code).toBe('CODE_INVALID');
  });

  test('5 wrong tries invalidate the code, even the right one afterwards', async () => {
    const { client, email, code } = await newAccount();
    const wrong = wrongCodeFor(code);
    for (let i = 1; i <= 4; i++) {
      expect((await verify(client, email, wrong)).body).toMatchObject({ code: 'WRONG_CODE', details: { attempts_left: 5 - i } });
    }
    expect((await verify(client, email, wrong)).body.code).toBe('TOO_MANY_ATTEMPTS');
    expect((await verify(client, email, code)).body.code).toBe('CODE_INVALID');
  });

  test('a resend invalidates the old code', async () => {
    const { client, email, code: oldCode } = await newAccount();
    await h.skipCooldown(email);
    const resend = await client.post('/api/auth/resend-verification').send({ email });
    expect(resend.body).toEqual({ ok: true, resend_after_seconds: 60 });
    const newCode = h.lastCodeSentTo(email);
    if (newCode !== oldCode) expect((await verify(client, email, oldCode)).body.code).toBe('WRONG_CODE');
    expect((await verify(client, email, newCode)).status).toBe(200);
    const rows = await AuthToken.findAll({ where: { purpose: 'verify_email' }, order: [['id', 'DESC']], limit: 2 });
    expect(rows[1].used_at).not.toBeNull(); // the old row was closed when the new code was made
  });

  test('resend: at most one code per 60 seconds per account, same neutral answer', async () => {
    const { client, email } = await newAccount();
    const before = await AuthToken.count();
    const res = await client.post('/api/auth/resend-verification').send({ email });
    expect(res.body).toEqual({ ok: true, resend_after_seconds: 60 });
    expect(await AuthToken.count()).toBe(before); // no new code within 60 s
  });

  test('resend: at most 10 codes per day per account', async () => {
    const { client, email } = await newAccount();
    for (let i = 0; i < 12; i++) {
      await h.skipCooldown(email);
      await client.post('/api/auth/resend-verification').send({ email });
    }
    const user = await require('../../src/models').User.findOne({ where: { email } });
    expect(await AuthToken.count({ where: { user_id: user.id, purpose: 'verify_email' } })).toBe(otp.DAILY_CAP);
  });

  test('resend for an unknown email gives the same answer and sends nothing', async () => {
    const client = await h.newClient();
    const before = h.sentEmails.length;
    const res = await client.post('/api/auth/resend-verification').send({ email: 'nobody-otp@example.test' });
    expect(res.body).toEqual({ ok: true, resend_after_seconds: 60 });
    expect(h.sentEmails.length).toBe(before);
  });
});

describe('rate limits per IP (express-rate-limit)', () => {
  beforeAll(() => {
    process.env.TEST_RATE_LIMITS = 'on';
  });
  afterAll(() => {
    delete process.env.TEST_RATE_LIMITS;
  });

  test('code checking is limited per IP (20 per 15 minutes)', async () => {
    const client = await h.newClient();
    let lastStatus = 0;
    for (let i = 0; i < 21; i++) {
      lastStatus = (await verify(client, 'nobody-limit@example.test', '123456')).status;
    }
    expect(lastStatus).toBe(429);
  });

  test('"send the code again" is limited per IP (5 per 15 minutes)', async () => {
    const client = await h.newClient();
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await client.post('/api/auth/resend-verification').send({ email: 'x@example.test' })).status);
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe('email outbox statuses (sent, failed, skipped) and the admin report', () => {
  let admin;
  const realFetch = global.fetch;

  beforeAll(async () => {
    admin = await h.adminClient();
  });
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.BREVO_API_KEY;
    delete process.env.MAIL_FROM;
  });

  test('without a Brevo key a code email is recorded as "skipped", never as sent', async () => {
    const { email } = await newAccount();
    const row = await Notification.findOne({ where: { recipient_email: email } });
    expect(row).toMatchObject({ type: 'verify_code', status: 'skipped', in_app: false, attempts: 1 });
    expect(row.last_error).toMatch(/BREVO_API_KEY is not set/);
    expect(JSON.stringify(row.payload_json)).not.toMatch(/\b\d{6}\b/); // the code is never stored
  });

  test('when Brevo accepts the email the status is "sent"', async () => {
    process.env.BREVO_API_KEY = 'test-key-not-real';
    process.env.MAIL_FROM = 'Smart Green Hub <noreply@example.test>';
    global.fetch = jest.fn(async () => ({ ok: true, status: 201, json: async () => ({ messageId: 'x' }) }));
    const client = await h.newClient();
    const email = `sent-${Date.now()}@example.test`;
    const res = await client.post('/api/auth/register').send(h.operatorData(email));
    expect(res.body.email_status).toBe('sent');
    const call = global.fetch.mock.calls[0];
    expect(JSON.parse(call[1].body).sender).toEqual({ name: 'Smart Green Hub', email: 'noreply@example.test' });
    expect((await Notification.findOne({ where: { recipient_email: email } })).status).toBe('sent');
  });

  test('when Brevo refuses, the status is "failed" with Brevo\'s exact answer', async () => {
    process.env.BREVO_API_KEY = 'test-key-not-real';
    process.env.MAIL_FROM = 'smart green, noreply@example.test'; // the comma form is understood too
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ code: 'permission_denied', message: 'api key is not authorized for resource "transactional.email"' }),
    }));
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    const client = await h.newClient();
    const email = `failed-${Date.now()}@example.test`;
    const res = await client.post('/api/auth/register').send(h.operatorData(email));
    expect(res.body.email_status).toBe('failed');
    const row = await Notification.findOne({ where: { recipient_email: email } });
    expect(row.status).toBe('failed');
    expect(row.last_error).toBe('Brevo HTTP 403 permission_denied: api key is not authorized for resource "transactional.email"');
    // The failure is logged with Brevo's status and message, never the key
    const logged = errorLog.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toMatch(/Brevo HTTP 403/);
    expect(logged).not.toContain('test-key-not-real');
    expect(logged).toMatch(/f\*\*\*@example\.test/); // recipient masked
    errorLog.mockRestore();
  });

  test('the admin report shows counts and failed + skipped emails with masked recipients', async () => {
    const res = await admin.get('/api/admin/emails');
    expect(res.status).toBe(200);
    expect(res.body.counts.sent).toBeGreaterThanOrEqual(1);
    expect(res.body.counts.failed).toBeGreaterThanOrEqual(1);
    expect(res.body.counts.skipped).toBeGreaterThanOrEqual(1);
    const failed = res.body.items.find((i) => i.status === 'failed');
    expect(failed).toMatchObject({ type: 'verify_code', attempts: 1, retry_issues_new_code: true });
    expect(failed.recipient).toMatch(/^f\*\*\*@example\.test$/);
    expect(failed.error).toMatch(/Brevo HTTP 403 permission_denied/);
    expect(JSON.stringify(res.body)).not.toMatch(/failed-\d+@example/); // full address never shown
  });

  test('Retry on a failed code email issues a NEW code; on a notification it sends again', async () => {
    const report = await admin.get('/api/admin/emails');
    const failedCode = report.body.items.find((i) => i.status === 'failed' && i.type === 'verify_code');
    await h.sequelize.query("UPDATE auth_tokens SET created_at = DATE_SUB(created_at, INTERVAL 2 MINUTE)");
    const before = await AuthToken.count();
    const retry = await admin.post(`/api/admin/emails/${failedCode.id}/retry`);
    expect(retry.body.result).toMatchObject({ new_code: true, status: 'skipped' }); // no key in tests
    expect(await AuthToken.count()).toBe(before + 1);

    // A notification email that failed is simply sent again from the outbox
    const user = await require('../../src/models').User.findOne({ where: { role: 'operator' } });
    const row = await notify({ userId: user.id, type: 'listing_expired', eventKey: `test:${Date.now()}`, payload: { species: 'Test' } });
    await row.update({ status: 'failed', attempts: 5, last_error: 'Brevo HTTP 500: test' });
    const again = await admin.post(`/api/admin/emails/${row.id}/retry`);
    expect(again.body.result).toMatchObject({ new_code: false, status: 'skipped' });
    await dispatchPending();
  });

  test('code emails never appear in the in-app notification list', async () => {
    const { email, client, code } = await newAccount();
    await verify(client, email, code);
    await client.post('/api/auth/login').send({ email, password: h.TEST_PASSWORD });
    const list = await client.get('/api/notifications');
    expect(list.body.items.find((i) => i.type === 'verify_code')).toBeUndefined();
  });
});

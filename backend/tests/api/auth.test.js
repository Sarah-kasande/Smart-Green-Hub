const h = require('../helpers');
const { User, AuthToken, AuditLog } = require('../../src/models');

beforeAll(h.resetDatabase);
afterAll(() => h.sequelize.close());

describe('health check', () => {
  test('still answers database: connected', async () => {
    const res = await (await h.newClient()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'connected' });
  });
});

describe('registration (FR02)', () => {
  test('registers an operator with a pending nursery and sends a confirmation email', async () => {
    const client = await h.newClient();
    const res = await client.post('/api/auth/register').send(h.operatorData('op1@example.test'));
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ role: 'operator', email: 'op1@example.test' });
    expect(res.body.user.password_hash).toBeUndefined();
    expect(h.lastTokenSentTo('op1@example.test')).toMatch(/^[a-f0-9]{64}$/);
  });

  test('stores a bcrypt hash, never the plain password', async () => {
    const user = await User.scope('withPassword').findOne({ where: { email: 'op1@example.test' } });
    expect(user.password_hash).toMatch(/^\$2[aby]\$/);
    expect(user.password_hash).not.toContain(h.TEST_PASSWORD);
  });

  test('stores only a hash of the email link token', async () => {
    const token = h.lastTokenSentTo('op1@example.test');
    const rows = await AuthToken.findAll();
    expect(rows.some((r) => r.token_hash === token)).toBe(false);
  });

  test('refuses to register an administrator', async () => {
    const client = await h.newClient();
    const res = await client.post('/api/auth/register').send(h.operatorData('sneaky@example.test', { role: 'admin' }));
    expect(res.status).toBe(400);
    expect(res.body.details.fields.role).toBe('invalid_choice');
  });

  test('refuses a duplicate email', async () => {
    const client = await h.newClient();
    const res = await client.post('/api/auth/register').send(h.operatorData('OP1@example.test'));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  test('refuses a weak password and missing nursery details', async () => {
    const client = await h.newClient();
    const res = await client
      .post('/api/auth/register')
      .send(h.operatorData('weak@example.test', { password: 'short', nursery: { district: 'Paris' } }));
    expect(res.status).toBe(400);
    expect(res.body.details.fields).toMatchObject({
      password: 'weak_password',
      'nursery.name': 'required',
      'nursery.district': 'invalid_choice',
    });
  });

  test('does not ask an institution for nursery details', async () => {
    const client = await h.newClient();
    const res = await client.post('/api/auth/register').send(h.institutionData('school1@example.test'));
    expect(res.status).toBe(201);
  });
});

describe('email confirmation and login', () => {
  test('login is refused until the email is confirmed', async () => {
    const client = await h.newClient();
    const res = await client.post('/api/auth/login').send({ email: 'op1@example.test', password: h.TEST_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('the confirmation link works once only', async () => {
    const client = await h.newClient();
    const token = h.lastTokenSentTo('op1@example.test');
    expect((await client.post('/api/auth/verify-email').send({ token })).status).toBe(200);
    const again = await client.post('/api/auth/verify-email').send({ token });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('INVALID_OR_EXPIRED_LINK');
  });

  test('wrong password gives one neutral error', async () => {
    const client = await h.newClient();
    const wrong = await client.post('/api/auth/login').send({ email: 'op1@example.test', password: 'Wrong12345' });
    const unknown = await client.post('/api/auth/login').send({ email: 'nobody@example.test', password: 'Wrong12345' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.code).toBe(unknown.body.code);
  });

  test('login sets an HttpOnly session cookie and /me shows the pending nursery', async () => {
    const client = await h.newClient();
    const res = await client.post('/api/auth/login').send({ email: 'op1@example.test', password: h.TEST_PASSWORD });
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('sgh_session='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await client.get('/api/auth/me');
    expect(me.body.user.email).toBe('op1@example.test');
    expect(me.body.organisation).toMatchObject({ type: 'nursery', name: 'Test Nursery', verification_status: 'pending' });
  });

  test('logout ends the session', async () => {
    const client = await h.registerVerifiedUser(h.operatorData('logout@example.test'));
    expect((await client.get('/api/auth/me')).body.user).not.toBeNull();
    await client.post('/api/auth/logout');
    expect((await client.get('/api/auth/me')).body.user).toBeNull();
  });

  test('actions are written to the audit log (FR16)', async () => {
    const actions = (await AuditLog.findAll()).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['user.registered', 'nursery.registered', 'user.email_verified', 'user.login']));
  });
});

describe('CSRF protection (NFR02)', () => {
  test('a change without the CSRF header is refused', async () => {
    const client = await h.newClient();
    const res = await client.agent.post('/api/auth/login').send({ email: 'op1@example.test', password: h.TEST_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_FAILED');
  });

  test('a wrong CSRF header is refused', async () => {
    const client = await h.newClient();
    const res = await client.agent.post('/api/auth/logout').set('X-CSRF-Token', 'x'.repeat(64));
    expect(res.status).toBe(403);
  });
});

describe('password reset (FR17)', () => {
  test('answers the same for known and unknown emails', async () => {
    const client = await h.newClient();
    const before = h.sentEmails.length;
    const unknown = await client.post('/api/auth/forgot-password').send({ email: 'nobody@example.test' });
    expect(unknown.status).toBe(200);
    expect(h.sentEmails.length).toBe(before); // nothing sent
    const known = await client.post('/api/auth/forgot-password').send({ email: 'op1@example.test' });
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  test('the reset link expires after 10 minutes', async () => {
    const client = await h.newClient();
    await client.post('/api/auth/forgot-password').send({ email: 'op1@example.test' });
    const token = h.lastTokenSentTo('op1@example.test');
    const row = await AuthToken.findOne({ where: { purpose: 'reset_password', used_at: null } });
    const minutes = (new Date(row.expires_at) - new Date(row.created_at)) / 60000;
    expect(Math.round(minutes)).toBe(10);

    await row.update({ expires_at: new Date(Date.now() - 1000) });
    const res = await client.post('/api/auth/reset-password').send({ token, password: 'NewGreen456' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_OR_EXPIRED_LINK');
  });

  test('a new password signs out every existing session', async () => {
    const oldSession = await h.newClient();
    await oldSession.post('/api/auth/login').send({ email: 'op1@example.test', password: h.TEST_PASSWORD });
    expect((await oldSession.get('/api/auth/me')).body.user).not.toBeNull();

    const client = await h.newClient();
    await client.post('/api/auth/forgot-password').send({ email: 'op1@example.test' });
    const token = h.lastTokenSentTo('op1@example.test');
    expect((await client.post('/api/auth/reset-password').send({ token, password: 'NewGreen456' })).status).toBe(200);

    // The old cookie no longer works
    expect((await oldSession.get('/api/auth/me')).body.user).toBeNull();
    // The old password fails, the new one works, and a confirmation email was sent
    expect((await client.post('/api/auth/login').send({ email: 'op1@example.test', password: h.TEST_PASSWORD })).status).toBe(401);
    expect((await client.post('/api/auth/login').send({ email: 'op1@example.test', password: 'NewGreen456' })).status).toBe(200);
    expect(h.sentEmails.at(-1).subject).toMatch(/password was changed/);
    // The same link cannot be used twice
    expect((await client.post('/api/auth/reset-password').send({ token, password: 'Another789' })).status).toBe(400);
  });
});

describe('language preference (FR18)', () => {
  test('a user can change their language', async () => {
    const client = await h.registerVerifiedUser(h.institutionData('lang@example.test'));
    const res = await client.patch('/api/me').send({ preferred_language: 'rw' });
    expect(res.status).toBe(200);
    expect(res.body.user.preferred_language).toBe('rw');
    expect((await client.patch('/api/me').send({ preferred_language: 'fr' })).status).toBe(400);
  });
});

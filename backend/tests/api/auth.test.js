const h = require('../helpers');
const { User, AuthToken, AuditLog } = require('../../src/models');

beforeAll(h.resetDatabase);
afterAll(() => h.sequelize.close());

describe('health check', () => {
  test('still answers database: connected, plus email and version (no secrets)', async () => {
    const res = await (await h.newClient()).get('/api/health');
    expect(res.status).toBe(200);
    // .env.test has no BREVO_API_KEY, so email is "not configured"
    expect(res.body).toEqual({ status: 'ok', database: 'connected', email: 'not configured', version: 'local' });
  });
});

describe('registration (FR02)', () => {
  test('registers an operator with a pending nursery and emails a 6-digit code', async () => {
    const client = await h.newClient();
    const res = await client.post('/api/auth/register').send(h.operatorData('op1@example.test'));
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ role: 'operator', email: 'op1@example.test' });
    expect(res.body.user.password_hash).toBeUndefined();
    // No Brevo key in tests: the email is not sent and is honestly reported as "skipped"
    expect(res.body).toMatchObject({ email_status: 'skipped', resend_after_seconds: 60 });
    expect(h.lastCodeSentTo('op1@example.test')).toMatch(/^\d{6}$/);
    // No clickable link in the email any more
    expect(h.sentEmails.at(-1).text).not.toMatch(/https?:\/\/\S+token/);
  });

  test('stores a bcrypt hash, never the plain password', async () => {
    const user = await User.scope('withPassword').findOne({ where: { email: 'op1@example.test' } });
    expect(user.password_hash).toMatch(/^\$2[aby]\$/);
    expect(user.password_hash).not.toContain(h.TEST_PASSWORD);
  });

  test('stores only an HMAC of the code, never the code', async () => {
    const code = h.lastCodeSentTo('op1@example.test');
    const rows = await AuthToken.findAll();
    expect(rows.every((r) => r.token_hash !== code && !r.token_hash.includes(code))).toBe(true);
    expect(rows[0].token_hash).toMatch(/^[a-f0-9]{64}$/);
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

  test('the code works once only; a code with spaces is accepted', async () => {
    const client = await h.newClient();
    const code = h.lastCodeSentTo('op1@example.test');
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect((await client.post('/api/auth/verify-email').send({ email: 'op1@example.test', code: spaced })).status).toBe(200);
    const again = await client.post('/api/auth/verify-email').send({ email: 'op1@example.test', code });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('ALREADY_VERIFIED');
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
    expect(actions).toEqual(
      expect.arrayContaining(['user.registered', 'nursery.registered', 'code.issued.verify_email', 'user.email_verified', 'user.login'])
    );
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

describe('password reset with a code (FR17)', () => {
  test('answers the same for known and unknown emails', async () => {
    const client = await h.newClient();
    const before = h.sentEmails.length;
    const unknown = await client.post('/api/auth/forgot-password').send({ email: 'nobody@example.test' });
    expect(unknown.status).toBe(200);
    expect(h.sentEmails.length).toBe(before); // nothing sent
    const known = await client.post('/api/auth/forgot-password').send({ email: 'op1@example.test' });
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(h.sentEmails.at(-1).subject).toMatch(/password reset code/);
  });

  test('a new password signs out every existing session; the code works once', async () => {
    const oldSession = await h.newClient();
    await oldSession.post('/api/auth/login').send({ email: 'op1@example.test', password: h.TEST_PASSWORD });
    expect((await oldSession.get('/api/auth/me')).body.user).not.toBeNull();

    const client = await h.newClient();
    const code = h.lastCodeSentTo('op1@example.test');
    expect((await client.post('/api/auth/reset-password').send({ email: 'op1@example.test', code, password: 'NewGreen456' })).status).toBe(200);

    // The old cookie no longer works (token_version increased)
    expect((await oldSession.get('/api/auth/me')).body.user).toBeNull();
    expect((await client.post('/api/auth/login').send({ email: 'op1@example.test', password: h.TEST_PASSWORD })).status).toBe(401);
    expect((await client.post('/api/auth/login').send({ email: 'op1@example.test', password: 'NewGreen456' })).status).toBe(200);
    expect(h.sentEmails.at(-1).subject).toMatch(/password was changed/);
    // The same code cannot be used twice
    const again = await client.post('/api/auth/reset-password').send({ email: 'op1@example.test', code, password: 'Another789' });
    expect(again.body.code).toBe('CODE_INVALID');
    const actions = (await AuditLog.findAll({ where: { entity_type: 'user' } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['code.issued.reset_password', 'user.password_reset']));
  });

  test('a weak new password is refused before the code is used', async () => {
    await h.skipCooldown('op1@example.test');
    const client = await h.newClient();
    await client.post('/api/auth/forgot-password').send({ email: 'op1@example.test' });
    const code = h.lastCodeSentTo('op1@example.test');
    const res = await client.post('/api/auth/reset-password').send({ email: 'op1@example.test', code, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.details.fields.password).toBe('weak_password');
    // The code is still valid
    expect((await client.post('/api/auth/reset-password').send({ email: 'op1@example.test', code, password: 'NewGreen789' })).status).toBe(200);
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

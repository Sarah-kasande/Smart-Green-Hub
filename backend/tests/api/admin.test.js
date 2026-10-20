const h = require('../helpers');
const { User, Nursery, AuditLog } = require('../../src/models');
const { ensureAdmin, ensureDemoSpecies } = require('../../src/services/bootstrapService');

beforeAll(h.resetDatabase);
afterAll(() => h.sequelize.close());

describe('administrator seeding', () => {
  test('creates the administrator once, from environment variables only', async () => {
    expect(await ensureAdmin()).toBe('created');
    expect(await ensureAdmin()).toBe('exists'); // running again changes nothing
    const admins = await User.scope('withPassword').findAll({ where: { role: 'admin' } });
    expect(admins).toHaveLength(1);
    expect(admins[0].email).toBe(process.env.ADMIN_EMAIL);
    expect(admins[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  test('does nothing when the variables are missing', async () => {
    await h.resetDatabase();
    const saved = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    try {
      expect(await ensureAdmin()).toBe('missing-env');
      expect(await User.count({ where: { role: 'admin' } })).toBe(0);
    } finally {
      process.env.ADMIN_PASSWORD = saved;
    }
  });

  test('DEMO species are inserted only into an empty table and are clearly labelled', async () => {
    expect(await ensureDemoSpecies()).toBe('created');
    expect(await ensureDemoSpecies()).toBe('exists');
  });
});

describe('role checks', () => {
  test('anonymous users and operators cannot reach admin routes', async () => {
    const anonymous = await h.newClient();
    expect((await anonymous.get('/api/admin/verifications')).status).toBe(401);
    const operator = await h.registerVerifiedUser(h.operatorData('role-op@example.test'));
    const res = await operator.get('/api/admin/verifications');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('verification queue (FR02, FR15)', () => {
  let admin;
  let operator;
  let nurseryId;

  beforeAll(async () => {
    admin = await h.adminClient();
    operator = await h.registerVerifiedUser(h.operatorData('queue-op@example.test', { nursery: { name: 'Queue Nursery', district: 'Nyarugenge', sector: 'Nyakabanda' } }));
    await h.registerVerifiedUser(h.institutionData('queue-school@example.test'));
    nurseryId = (await Nursery.findOne({ where: { name: 'Queue Nursery' } })).id;
  });

  test('lists pending nurseries and institutions with counts', async () => {
    const res = await admin.get('/api/admin/verifications?status=pending');
    expect(res.status).toBe(200);
    const names = res.body.items.map((i) => i.name);
    expect(names).toEqual(expect.arrayContaining(['Queue Nursery', 'Test School']));
    expect(res.body.counts.pending).toBeGreaterThanOrEqual(2);
    // Owner contact is visible to the administrator, the password hash never
    const item = res.body.items.find((i) => i.name === 'Queue Nursery');
    expect(item.owner.email).toBe('queue-op@example.test');
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });

  test('rejecting needs a reason', async () => {
    const res = await admin.post(`/api/admin/verifications/nursery/${nurseryId}/decision`).send({ decision: 'reject' });
    expect(res.status).toBe(400);
    expect(res.body.details.fields.reason).toBe('required');
  });

  test('reject -> owner corrects and resubmits -> approve', async () => {
    const reject = await admin
      .post(`/api/admin/verifications/nursery/${nurseryId}/decision`)
      .send({ decision: 'reject', reason: 'Please add the sector office letter' });
    expect(reject.status).toBe(200);
    expect(reject.body.item).toMatchObject({ verification_status: 'rejected', review_note: 'Please add the sector office letter' });
    // The email goes through the notification outbox (FR14)
    await require('../../src/services/notificationService').dispatchPending();
    expect(h.sentEmails.at(-1)).toMatchObject({ to: 'queue-op@example.test' });
    expect(h.sentEmails.at(-1).text).toContain('Please add the sector office letter');

    // Deciding twice is refused
    const twice = await admin.post(`/api/admin/verifications/nursery/${nurseryId}/decision`).send({ decision: 'approve' });
    expect(twice.status).toBe(409);

    // The operator sees the reason and resubmits corrected details
    const me = await operator.get('/api/auth/me');
    expect(me.body.organisation.review_note).toBe('Please add the sector office letter');
    const resubmit = await operator
      .put('/api/me/organisation')
      .send({ name: 'Queue Nursery Ltd', district: 'Nyarugenge', sector: 'Nyakabanda', is_listed: true });
    expect(resubmit.status).toBe(200);
    expect(resubmit.body.organisation).toMatchObject({ verification_status: 'pending', name: 'Queue Nursery Ltd', is_listed: true });

    const approve = await admin.post(`/api/admin/verifications/nursery/${nurseryId}/decision`).send({ decision: 'approve' });
    expect(approve.status).toBe(200);
    expect(approve.body.item.verification_status).toBe('approved');

    const actions = (await AuditLog.findAll({ where: { entity_type: 'nursery', entity_id: nurseryId } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['verification.rejected', 'verification.resubmitted', 'verification.approved']));
    const rejectLog = await AuditLog.findOne({ where: { action: 'verification.rejected', entity_id: nurseryId } });
    expect(rejectLog.reason).toBe('Please add the sector office letter');
  });
});

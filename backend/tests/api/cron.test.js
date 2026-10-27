// The nightly job route used by Vercel Cron: it runs only with the right CRON_SECRET.
const request = require('supertest');
const h = require('../helpers');
const app = require('../../src/app');

const SECRET = 'test-cron-secret-1234567890';

beforeAll(async () => {
  await h.resetDatabase();
  process.env.CRON_SECRET = SECRET;
});
afterAll(async () => {
  delete process.env.CRON_SECRET;
  await h.sequelize.close();
});

describe('GET /api/cron/nightly', () => {
  test('refuses a request without the secret', async () => {
    const res = await request(app).get('/api/cron/nightly');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  test('refuses a wrong secret', async () => {
    const res = await request(app).get('/api/cron/nightly').set('Authorization', 'Bearer wrong');
    expect(res.status).toBe(401);
  });

  test('refuses everything when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET;
    try {
      const res = await request(app).get('/api/cron/nightly').set('Authorization', 'Bearer ');
      expect(res.status).toBe(401);
    } finally {
      process.env.CRON_SECRET = SECRET;
    }
  });

  test('runs the nightly job with the right secret', async () => {
    const res = await request(app).get('/api/cron/nightly').set('Authorization', `Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.emails).toBeDefined();
  });
});

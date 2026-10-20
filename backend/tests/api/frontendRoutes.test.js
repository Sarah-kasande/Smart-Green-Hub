// Contract between frontend and backend: every API address the frontend calls must exist here.
// 1. Every GET the administrator pages make returns 200 for an administrator.
// 2. All frontend calls are found automatically in frontend/src and each one is sent, as the
//    matching role, to the API. None may answer ROUTE_NOT_FOUND ("this address does not exist").
//    Other answers (400 validation, 404 for a missing record, 409, ...) are fine here: they prove
//    the route exists. This would have caught a page calling a route the API does not have.
const fs = require('fs');
const path = require('path');
const h = require('../helpers');

const FRONTEND_SRC = path.join(__dirname, '..', '..', '..', 'frontend', 'src');

let admin;
let operator;
let institution;

beforeAll(async () => {
  await h.resetDatabase();
  admin = await h.adminClient();
  await h.demoSpecies();
  operator = (await h.approvedUser(admin, h.operatorData(h.uniqueEmail('contract-op')))).client;
  institution = (await h.approvedUser(admin, h.institutionData(h.uniqueEmail('contract-school')))).client;
});
afterAll(() => h.sequelize.close());

describe('administrator pages', () => {
  test.each([
    ['Dashboard', '/api/admin/dashboard'],
    ['Verification Queue', '/api/admin/verifications'],
    ['Rules & Species: rules', '/api/admin/rules'],
    ['Rules & Species: species', '/api/admin/species?archived=false'],
    ['Listings', '/api/admin/listings?status=active'],
    ['Impact', '/api/admin/impact'],
    ['Audit log', '/api/admin/audit'],
    ['Email problems', '/api/admin/notifications/failed'],
    ['Notification bell', '/api/notifications'],
  ])('%s: GET %s answers 200', async (_page, url) => {
    const res = await admin.get(url);
    expect(res.status).toBe(200);
  });
});

// ---- Automatic scan of the frontend ----

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(js|jsx)$/.test(entry.name) ? [full] : [];
  });
}

// Turns a template like `/admin/verifications/${item.type}/${item.id}` into real test URLs.
function expand(template) {
  let urls = [template];
  // Placeholders that stand for a role or side: try each possibility
  const roleLike = [
    ['${user.role}', ['admin', 'operator', 'institution']],
    ['${side}', ['operator', 'institution']],
    ['${kind}', ['sales', 'expenses']],
  ];
  for (const [placeholder, values] of roleLike) {
    urls = urls.flatMap((u) => (u.includes(placeholder) ? values.map((v) => u.split(placeholder).join(v)) : [u]));
  }
  return urls.map((u) =>
    u
      .replace(/\$\{[^}]*\.type\}/g, 'nursery') // verification item type
      .replace(/\$\{qs\([^}]*\}\)?\}?/g, '') // query strings built with qs(...)
      .replace(/\$\{[^}]*\}/g, '1') // every other placeholder is an id or a filter value
      .replace(/\?$/, '')
  );
}

function frontendCalls() {
  const calls = new Map();
  const pattern = /(?:api\.(get|post|put|patch|delete)|useApi)\(\s*[`'"](\/[^`'"]*)[`'"]/g;
  for (const file of sourceFiles(FRONTEND_SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const match of src.matchAll(pattern)) {
      const method = (match[1] || 'get').toUpperCase();
      for (const url of expand(match[2])) calls.set(`${method} ${url}`, { method, url, file: path.relative(FRONTEND_SRC, file) });
    }
  }
  return [...calls.values()];
}

// Calls that would end the test sessions or are not about route existence
const SKIP = new Set(['POST /auth/logout', 'POST /auth/login', 'POST /auth/register', 'POST /auth/reset-password']);

describe('every API call in frontend/src exists in the backend', () => {
  const calls = frontendCalls();

  test('the scan finds the frontend calls', () => {
    expect(calls.length).toBeGreaterThan(40);
  });

  test.each(calls.filter((c) => !SKIP.has(`${c.method} ${c.url}`)).map((c) => [`${c.method} /api${c.url}`, c]))('%s', async (_name, call) => {
    let client = admin;
    if (call.url.startsWith('/operator')) client = operator;
    if (call.url.startsWith('/institution') || call.url === '/me/documents') client = institution;
    const method = call.method.toLowerCase();
    const req = method === 'get' ? client.get(`/api${call.url}`) : client.agent[method](`/api${call.url}`).set('X-CSRF-Token', client.csrf).send({});
    const res = await req;
    // Any answer except "this route does not exist" (and no server crash) proves the route is there
    expect(res.body?.code).not.toBe('ROUTE_NOT_FOUND');
    expect(res.status).not.toBe(500);
  });
});

describe('unknown addresses', () => {
  test('answer ROUTE_NOT_FOUND, not a generic "not found"', async () => {
    const res = await admin.get('/api/admin/this-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ROUTE_NOT_FOUND');
  });
});

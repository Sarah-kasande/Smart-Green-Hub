const h = require('../helpers');

// Smallest valid starts of real files (only the signature matters for the check)
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 1)]);
const PDF_HEADER = Buffer.from('%PDF-1.4\n');

let owner;
let otherUser;
let admin;
let fileId;

beforeAll(async () => {
  await h.resetDatabase();
  owner = await h.registerVerifiedUser(h.operatorData('files-op@example.test'));
  otherUser = await h.registerVerifiedUser(h.institutionData('files-school@example.test'));
  admin = await h.adminClient();
});
afterAll(() => h.sequelize.close());

const upload = (client, buffer, type, name = 'licence.png') =>
  client.post('/api/uploads/verification-documents').set('Content-Type', type).set('X-File-Name', encodeURIComponent(name)).send(buffer);

describe('verification documents (NFR03)', () => {
  test('accepts a real PNG', async () => {
    const res = await upload(owner, PNG, 'image/png');
    expect(res.status).toBe(201);
    expect(res.body.document).toMatchObject({ original_name: 'licence.png', mime_type: 'image/png', size_bytes: PNG.length });
    fileId = res.body.document.id;
  });

  test('refuses a file whose content is not PDF, PNG or JPEG', async () => {
    const res = await upload(owner, Buffer.from('MZ fake program'), 'application/pdf', 'evil.pdf');
    expect(res.status).toBe(415);
    expect(res.body.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  test('refuses a PNG sent as a PDF (type does not match content)', async () => {
    expect((await upload(owner, PNG, 'application/pdf', 'x.pdf')).status).toBe(415);
  });

  test('refuses a file larger than 10 MB', async () => {
    const big = Buffer.concat([PDF_HEADER, Buffer.alloc(10 * 1024 * 1024)]);
    const res = await upload(owner, big, 'application/pdf', 'big.pdf');
    expect(res.status).toBe(413);
  });

  test('stores a file of almost exactly 10 MB in MySQL', async () => {
    const size = 10 * 1024 * 1024 - 1;
    const file = Buffer.concat([PDF_HEADER, Buffer.alloc(size - PDF_HEADER.length, 0x20)]);
    const res = await upload(owner, file, 'application/pdf', 'scan.pdf');
    expect(res.status).toBe(201);
    expect(res.body.document.size_bytes).toBe(size);
    const back = await owner.agent.get(`/api/uploads/${res.body.document.id}`).buffer(true);
    expect(back.body.length).toBe(size);
  });

  test('the owner can download it, without caching', async () => {
    const res = await owner.agent.get(`/api/uploads/${fileId}`).buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(Buffer.compare(res.body, PNG)).toBe(0);
  });

  test('another user gets "not found"; anonymous gets 401', async () => {
    expect((await otherUser.get(`/api/uploads/${fileId}`)).status).toBe(404);
    expect((await (await h.newClient()).get(`/api/uploads/${fileId}`)).status).toBe(401);
  });

  test('the administrator can see and open it from the verification queue', async () => {
    const list = await admin.get('/api/admin/verifications');
    const nursery = list.body.items.find((i) => i.owner.email === 'files-op@example.test');
    const detail = await admin.get(`/api/admin/verifications/nursery/${nursery.id}`);
    expect(detail.body.item.documents.map((d) => d.id)).toContain(fileId);
    expect((await admin.agent.get(`/api/uploads/${fileId}`)).status).toBe(200);
  });

  test('administrators cannot upload verification documents for themselves', async () => {
    expect((await upload(admin, PNG, 'image/png')).status).toBe(403);
  });
});

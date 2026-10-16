const { detectMimeType } = require('../../src/utils/fileSignature');
const { generateToken, hashToken, safeEqual } = require('../../src/utils/tokens');
const { parseSender } = require('../../src/services/emailService');
const { assertSafeTestDatabase } = require('../guard');

describe('file signature check', () => {
  test.each([
    [[0x25, 0x50, 0x44, 0x46, 0x2d, 0x31], 'application/pdf'],
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0], 'image/png'],
    [[0xff, 0xd8, 0xff, 0xe0], 'image/jpeg'],
    [[0x4d, 0x5a, 0x90, 0x00], null], // Windows program
    [[0x50, 0x4b, 0x03, 0x04], null], // ZIP / .docx
    [[], null],
  ])('%j -> %s', (bytes, expected) => {
    expect(detectMimeType(Buffer.from(bytes))).toBe(expected);
  });
});

describe('tokens', () => {
  test('are 64 hex characters and different every time', () => {
    const a = generateToken();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(generateToken()).not.toBe(a);
  });
  test('hashing is stable and does not return the token', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe('abc');
  });
  test('safeEqual', () => {
    expect(safeEqual('same', 'same')).toBe(true);
    expect(safeEqual('same', 'diff')).toBe(false);
    expect(safeEqual('short', 'longer')).toBe(false);
  });
});

describe('email sender parsing', () => {
  test('reads "Name <email>" and a bare email', () => {
    expect(parseSender('Smart Green Hub <hi@example.test>')).toEqual({ name: 'Smart Green Hub', email: 'hi@example.test' });
    expect(parseSender('hi@example.test')).toEqual({ name: 'Smart Green Hub', email: 'hi@example.test' });
  });
});

describe('test database guard', () => {
  const saved = { host: process.env.DB_HOST, name: process.env.DB_NAME };
  afterEach(() => {
    process.env.DB_HOST = saved.host;
    process.env.DB_NAME = saved.name;
  });
  test('aborts when DB_HOST is an Aiven host', () => {
    process.env.DB_HOST = 'mysql-abc.aivencloud.com';
    expect(assertSafeTestDatabase).toThrow(/Aiven/);
  });
  test('aborts when the database name does not end with _test', () => {
    process.env.DB_NAME = 'smart_green_hub_dev';
    expect(assertSafeTestDatabase).toThrow(/_test/);
  });
});

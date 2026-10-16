// Safety guard: tests must NEVER run against the production database (Aiven).
// Called before any test touches a database. Throws, which stops the whole test run.
function assertSafeTestDatabase() {
  const host = (process.env.DB_HOST || '').toLowerCase();
  const name = process.env.DB_NAME || '';
  if (host.includes('aivencloud.com')) {
    throw new Error('ABORTED: DB_HOST points to Aiven (production). Tests must use the local test database in .env.test.');
  }
  if (!name.endsWith('_test')) {
    throw new Error(`ABORTED: DB_NAME "${name}" does not end with "_test". Tests only run on a dedicated test database.`);
  }
}

module.exports = { assertSafeTestDatabase };

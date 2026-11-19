// Safety guard: tests must NEVER run against the live database (Neon "neondb" or any remote host).
// Called before any test touches a database. Throws, which stops the whole test run.
const { dbTarget, describeTarget } = require('../src/utils/dbSafety');

function assertSafeTestDatabase() {
  const target = dbTarget();
  if (target.live) {
    throw new Error(`ABORTED: tests refuse to run against ${describeTarget(target)}. Tests only use the local test database in .env.test.`);
  }
  if (!target.name.endsWith('_test')) {
    throw new Error(`ABORTED: DB_NAME "${target.name}" does not end with "_test". Tests only run on a dedicated test database.`);
  }
}

module.exports = { assertSafeTestDatabase };

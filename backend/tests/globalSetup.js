// Runs once before all tests: rebuilds the test database from the migrations,
// which also proves every migration (and its undo) still works.
const { execSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  require('../src/config/env');
  require('./guard').assertSafeTestDatabase();

  const options = { cwd: path.join(__dirname, '..'), env: { ...process.env, NODE_ENV: 'test' }, stdio: 'pipe' };
  execSync('npx sequelize-cli db:migrate:undo:all', options);
  execSync('npx sequelize-cli db:migrate', options);
};

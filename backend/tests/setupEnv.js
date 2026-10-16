// Runs in every test file before anything else.
process.env.NODE_ENV = 'test';
require('../src/config/env'); // loads .env.test only
require('./guard').assertSafeTestDatabase();

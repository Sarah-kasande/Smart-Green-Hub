// Local use: npm run seed:admin
// Creates the first administrator from ADMIN_EMAIL and ADMIN_PASSWORD if no administrator exists.
// The server also does this automatically on startup, so on Render nothing needs to be run by hand.
require('../src/config/env');
const { sequelize } = require('../src/models');
const { ensureAdmin } = require('../src/services/bootstrapService');

const messages = {
  exists: 'An administrator already exists. Nothing changed.',
  created: 'Administrator created.',
  'missing-env': 'ADMIN_EMAIL or ADMIN_PASSWORD is not set. Nothing changed.',
  'email-in-use': 'ADMIN_EMAIL already belongs to another account. Nothing changed.',
};

ensureAdmin()
  .then((status) => {
    console.log(messages[status]);
    return sequelize.close();
  })
  .catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  });

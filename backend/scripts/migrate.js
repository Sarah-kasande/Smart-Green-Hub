// The ONLY way to run database migrations (see the "migrate..." and "start" scripts in package.json).
//
//   npm run migrate              apply new migrations to the LOCAL database only
//   npm run migrate:status       show which migrations ran (local, read-only)
//   npm run migrate:undo         undo the last migration (LOCAL only, never the live database)
//   npm run migrate:live         apply new migrations to the LIVE database (reads backend/.env only)
//   npm run migrate:live:status  show which migrations ran on the LIVE database (read-only)
//   npm start                    (Render) apply new migrations, then start the API
//
// The live database is Aiven "defaultdb" or any remote host (src/utils/dbSafety.js). It is changed
// only by "--live" (a command typed on purpose) or "--deploy" on the hosting platform itself.
// Migrations only ever ADD tables and columns (and the default rule settings), so running them
// again on an up-to-date database changes nothing. Undo is refused on the live database.
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const command = ['status', 'undo'].includes(args[0]) ? args[0] : 'up';
const live = args.includes('--live');
const deploy = args.includes('--deploy');

// "--live" on this computer reads ONLY backend/.env (the Aiven settings), never .env.local.
if (live && !process.env.ENV_FILE) process.env.ENV_FILE = '.env';
require('../src/config/env');
const { dbTarget, describeTarget } = require('../src/utils/dbSafety');

const target = dbTarget();
const onHostingPlatform = process.env.RENDER === 'true' || process.env.VERCEL === '1';

function stop(message) {
  console.error(`Migrations: STOP. ${message}`);
  process.exit(1);
}

if (target.live) {
  if (command === 'undo') stop(`Undoing migrations on the live ${describeTarget(target)} is never allowed.`);
  if (command === 'up' && !live && !(deploy && onHostingPlatform)) {
    stop(`The target is the live ${describeTarget(target)}. To apply migrations there on purpose, run: npm run migrate:live`);
  }
  if (command === 'status' && !live && !deploy) {
    stop(`The target is the live ${describeTarget(target)}. For a read-only check run: npm run migrate:live:status`);
  }
}

const cliCommand = { up: 'db:migrate', status: 'db:migrate:status', undo: 'db:migrate:undo' }[command];
console.log(`Migrations: ${cliCommand} on ${describeTarget(target)}`);

const env = { ...process.env };
if (target.live) env.SGH_LIVE_MIGRATION = 'allowed'; // read by src/config/sequelize-cli.js
const result = spawnSync('npx', ['sequelize-cli', cliCommand], {
  cwd: path.join(__dirname, '..'),
  env,
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status === null ? 1 : result.status);

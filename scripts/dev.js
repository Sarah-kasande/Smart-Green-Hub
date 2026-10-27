// Starts the whole app for local development with ONE command (run from the project root):
//   npm run dev
//
// What it does, in order:
//   0. checks that the API and the app are not already running (ports 5000 and 5173)
//   1. installs the packages of backend/ and frontend/ if they are missing
//   2. starts the local MySQL container (sgh-mysql) and waits until MySQL answers,
//      because the API checks the database only once, when it starts
//   3. brings the database up to date (migrations)
//   4. starts the API (http://localhost:5000) and the app (http://localhost:5173) at the same time;
//      their output is shown with [api] and [app] in front of each line
// Ctrl+C stops both. If one of them stops on its own, the other is stopped too.
//
// Option:  --no-db  skips step 2 (when the database is not the local Docker one)
// No extra packages are needed: only Node.js, npm and Docker Desktop.
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const CONTAINER = 'sgh-mysql';
const isWindows = process.platform === 'win32';
const skipDb = process.argv.includes('--no-db');

const colours = { api: '\x1b[36m', app: '\x1b[32m', dev: '\x1b[33m' };
const reset = '\x1b[0m';
const say = (text) => console.log(`${colours.dev}[dev]${reset} ${text}`);

function stopWith(message) {
  console.error(`\n${colours.dev}[dev]${reset} ${message}\n`);
  process.exit(1);
}

// Runs a command and waits for it. shell:true lets Windows find npm.cmd and docker.exe.
function run(command, cwd = root, quiet = false) {
  const result = spawnSync(command, { cwd, shell: true, stdio: quiet ? 'pipe' : 'inherit' });
  return result.status === 0;
}

// Is something already answering on this port? (e.g. the API still running in another terminal)
function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: 'localhost' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- the two running processes ----------
const children = [];
let stopping = false;

// Prints a process's output line by line with its label in front
function pipeWithLabel(stream, label, target) {
  let rest = '';
  stream.on('data', (chunk) => {
    const lines = (rest + chunk.toString()).split(/\r?\n/);
    rest = lines.pop();
    for (const line of lines) target.write(`${colours[label]}[${label}]${reset} ${line}\n`);
  });
  stream.on('end', () => rest && target.write(`${colours[label]}[${label}]${reset} ${rest}\n`));
}

function start(label, folder) {
  const child = spawn('npm run dev', { cwd: path.join(root, folder), shell: true, env: { ...process.env, FORCE_COLOR: '1' } });
  pipeWithLabel(child.stdout, label, process.stdout);
  pipeWithLabel(child.stderr, label, process.stderr);
  child.on('exit', (code) => {
    if (stopping) return;
    say(`The ${label === 'api' ? 'API' : 'app'} stopped (code ${code}). Stopping everything.`);
    stopAll(code || 1);
  });
  children.push(child);
}

// Stops both processes. On Windows "npm run dev" runs inside a shell, so the whole process
// tree must be stopped (taskkill /T), otherwise Node or Vite keeps running in the background.
function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGINT');
  }
  process.exit(code);
}
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

// ---------- the steps ----------
async function main() {
  // 0. Nothing may already run on the API or app port, otherwise you would get a second copy
  for (const [port, name] of [[5000, 'API'], [5173, 'app']]) {
    if (await portInUse(port)) {
      stopWith(
        `Port ${port} is already in use: the ${name} seems to be running already (another terminal?).\n` +
          '      Stop it there with Ctrl+C (or close that terminal), then run npm run dev again.'
      );
    }
  }

  // 1. Packages
  for (const part of ['backend', 'frontend']) {
    if (!fs.existsSync(path.join(root, part, 'node_modules'))) {
      say(`Installing the ${part} packages (first time only)...`);
      if (!run('npm install', path.join(root, part))) stopWith(`npm install failed in ${part}/.`);
    }
  }

  // 2. Database
  if (!skipDb) {
    say(`Starting the database container ${CONTAINER}...`);
    if (!run(`docker start ${CONTAINER}`, root, true)) {
      stopWith(
        `Could not start the database container "${CONTAINER}".\n` +
          '      - Is Docker Desktop open? Start it, wait until it says "Engine running", then try again.\n' +
          '      - First time on this computer? Create the container with the command in README.md, section 10.\n' +
          '      - Using another database? Run: npm run dev -- --no-db'
      );
    }
    // "mysqladmin ping" answers as soon as MySQL accepts connections (no password needed)
    say('Waiting for MySQL to be ready...');
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) {
      ready = run(`docker exec ${CONTAINER} mysqladmin ping --silent`, root, true);
      if (!ready) await wait(1000);
    }
    if (!ready) stopWith('MySQL did not become ready within 60 seconds. Check Docker Desktop.');
    say('Database is ready.');
  }

  // 3. Migrations (safe to run every time: only new changes are applied)
  say('Bringing the database up to date...');
  if (!run('npm run migrate --silent', path.join(root, 'backend'))) {
    stopWith('The database migrations failed (see the message above). Check backend/.env.local.');
  }

  // 4. API and app together
  say('Starting the API and the app. Press Ctrl+C to stop both.');
  start('api', 'backend');
  start('app', 'frontend');
  say('When both are ready, open http://localhost:5173');
}

main();

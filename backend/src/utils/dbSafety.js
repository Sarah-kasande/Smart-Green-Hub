// Tells the LIVE database apart from a local, throwaway one, so tests and scripts that create or
// delete rows can refuse to touch real data.
//
// The live database is Neon PostgreSQL (DATABASE_URL, database "neondb").
// A target counts as LIVE when the host is not this computer, or when the database is called "neondb"
// (even on this computer). Only localhost / 127.0.0.1 / ::1 with another name is local.
const { postgresUrl } = require('../config/database');

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];
const LIVE_DATABASE_NAMES = ['neondb'];

function dbTarget(env = process.env) {
  let host = (env.DB_HOST || '').trim().toLowerCase();
  let name = (env.DB_NAME || '').trim();
  const url = postgresUrl(env);
  if (url) {
    try {
      const parsed = new URL(url);
      host = parsed.hostname.toLowerCase();
      name = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    } catch {
      host = 'unparseable';
    }
  }
  const localHost = LOCAL_HOSTS.includes(host);
  const liveName = LIVE_DATABASE_NAMES.includes(name);
  return { host, name, local: localHost && !liveName, live: !localHost || liveName };
}

// Safe to print: never shows a remote host name (or anything else from the connection settings).
function describeTarget(target = dbTarget()) {
  const where = LOCAL_HOSTS.includes(target.host) ? target.host : target.host ? 'a remote host' : 'no host set';
  return `database "${target.name || '(no name)'}" on ${where}`;
}

module.exports = { dbTarget, describeTarget, LOCAL_HOSTS, LIVE_DATABASE_NAMES };

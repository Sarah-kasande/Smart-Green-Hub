// Tells the LIVE database apart from a local, throwaway one, so tests and scripts that create or
// delete rows can refuse to touch real data.
//
// The live database is Aiven's free plan, which allows exactly one database: "defaultdb".
// A target counts as LIVE when the host is not this computer, or when the database is "defaultdb"
// (even on this computer). Only localhost / 127.0.0.1 / ::1 with another database name is local.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];
const LIVE_DATABASE_NAME = 'defaultdb';

function dbTarget(env = process.env) {
  const host = (env.DB_HOST || '').trim().toLowerCase();
  const name = (env.DB_NAME || '').trim();
  const localHost = LOCAL_HOSTS.includes(host);
  return { host, name, local: localHost && name !== LIVE_DATABASE_NAME, live: !localHost || name === LIVE_DATABASE_NAME };
}

// Safe to print: never shows a remote host name (or anything else from the connection settings).
function describeTarget(target = dbTarget()) {
  const where = LOCAL_HOSTS.includes(target.host) ? target.host : target.host ? 'a remote host' : 'no host set';
  return `database "${target.name || '(no name)'}" on ${where}`;
}

module.exports = { dbTarget, describeTarget, LOCAL_HOSTS, LIVE_DATABASE_NAME };

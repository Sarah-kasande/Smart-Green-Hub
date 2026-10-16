const crypto = require('crypto');

// A random token for single-use links. 32 bytes = 256 bits, written as 64 hex characters.
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// We store only the SHA-256 hash of each link token (NFR02).
// When a link is used we hash the token from the URL and look up the hash.
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// Compares two strings in constant time, so an attacker cannot guess a value from response timing.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { generateToken, hashToken, safeEqual };

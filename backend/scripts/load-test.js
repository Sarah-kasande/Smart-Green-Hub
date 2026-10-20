// Small load test for NFR01 (50 concurrent users, p95 < 1 s for ordinary reads, warmed API).
// Usage (API running locally): node scripts/load-test.js [baseUrl] [users] [requestsPerUser]
// Uses only Node's built-in fetch, no extra library. Reads public and signed-in endpoints.
const base = process.argv[2] || 'http://localhost:5000';
const users = Number(process.argv[3] || 50);
const perUser = Number(process.argv[4] || 20);

const ENDPOINTS = ['/api/health', '/api/public/directory', '/api/public/impact', '/api/auth/me'];

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function user(id, times, errors) {
  for (let i = 0; i < perUser; i++) {
    const path = ENDPOINTS[(id + i) % ENDPOINTS.length];
    const started = performance.now();
    try {
      const res = await fetch(base + path);
      await res.arrayBuffer();
      if (!res.ok) errors.push(`${path} ${res.status}`);
    } catch (e) {
      errors.push(`${path} ${e.message}`);
    }
    times.push(performance.now() - started);
  }
}

(async () => {
  // Warm-up (NFR01 measures the warmed API; Render cold starts are reported separately)
  for (const path of ENDPOINTS) await fetch(base + path).catch(() => {});
  const times = [];
  const errors = [];
  const started = performance.now();
  await Promise.all(Array.from({ length: users }, (_, id) => user(id, times, errors)));
  const total = (performance.now() - started) / 1000;
  times.sort((a, b) => a - b);
  console.log(`Users: ${users}, requests: ${times.length}, errors: ${errors.length}, duration: ${total.toFixed(1)} s`);
  console.log(`Median: ${percentile(times, 50).toFixed(0)} ms, p95: ${percentile(times, 95).toFixed(0)} ms, max: ${times.at(-1).toFixed(0)} ms`);
  if (errors.length) console.log('First errors:', errors.slice(0, 5));
})();

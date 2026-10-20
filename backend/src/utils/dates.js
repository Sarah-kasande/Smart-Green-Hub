// Date helpers. All "calendar dates" are strings "YYYY-MM-DD" in Kigali time.
// Kigali is always UTC+2 (no daylight saving), so a fixed offset is enough.
const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Today's date in Kigali, e.g. "2026-10-20". `now` can be passed in tests.
function todayKigali(now = new Date()) {
  return new Date(now.getTime() + KIGALI_OFFSET_MS).toISOString().slice(0, 10);
}

// "2026-10-20" + 5 -> "2026-10-25"
function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00Z`);
  return new Date(d.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

// Whole days from `from` to `to` (negative if `to` is earlier)
function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / DAY_MS);
}

// Start of a Kigali calendar day as a real instant (for DATETIME comparisons)
function kigaliDayStart(dateString) {
  return new Date(new Date(`${dateString}T00:00:00Z`).getTime() - KIGALI_OFFSET_MS);
}

module.exports = { todayKigali, addDays, daysBetween, kigaliDayStart, DAY_MS };

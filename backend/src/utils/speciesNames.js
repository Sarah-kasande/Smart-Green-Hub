// Comparing plant names typed by different people, to prevent duplicate species.
// The same rules are copied in frontend/src/utils/speciesNames.js (used offline).
//
//   normalizeName('  Rosé (Rose) ')  -> 'roserose'
//     accents removed, lower case, and everything that is not a letter or digit removed,
//     so "Grevillea robusta", "grevillea  robusta" and "Grévillea-Robusta" are the SAME name.
//   isSimilar(a, b) on two normalized names:
//     the same name, or one name contains the other (e.g. "grevillea" and "grevillearobusta"),
//     or they differ by a small typing mistake (1 letter for short names, 2 for long ones).

function normalizeName(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // the accents split off by NFD
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Number of single-letter changes (add, remove, replace) to turn a into b (Levenshtein distance)
function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const replace = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, replace);
    }
    previous = current;
  }
  return previous[b.length];
}

function isSimilar(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length >= 4 && longer.includes(shorter)) return true;
  const allowed = shorter.length >= 8 ? 2 : shorter.length >= 4 ? 1 : 0;
  return allowed > 0 && editDistance(a, b) <= allowed;
}

// Does a species (its English or local name) match the typed name?
//   'exact'   the same name once normalized
//   'similar' close enough to ask "Did you mean ...?"
//   null      different
function compareSpecies(species, typedName) {
  const typed = normalizeName(typedName);
  const names = [species.common_name, species.kinyarwanda_name].map(normalizeName).filter(Boolean);
  if (names.includes(typed)) return 'exact';
  return names.some((name) => isSimilar(name, typed)) ? 'similar' : null;
}

module.exports = { normalizeName, editDistance, isSimilar, compareSpecies };

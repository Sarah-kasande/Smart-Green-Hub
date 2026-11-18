// Comparing plant names, the same rules as backend/src/utils/speciesNames.js.
// Used on the Add batch form when the phone is offline, to still ask "Did you mean ...?"
// against the species saved on the phone.
//   normalizeName(' Rosé (Rose) ') -> 'roserose'  (accents, case, spaces and punctuation ignored)

export function normalizeName(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

// Number of single-letter changes to turn a into b (Levenshtein distance)
function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    previous = current
  }
  return previous[b.length]
}

function isSimilar(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  if (shorter.length >= 4 && longer.includes(shorter)) return true
  const allowed = shorter.length >= 8 ? 2 : shorter.length >= 4 ? 1 : 0
  return allowed > 0 && editDistance(a, b) <= allowed
}

// 'exact', 'similar' or null for one species and a typed name
export function compareSpecies(species, typedName) {
  const typed = normalizeName(typedName)
  const names = [species.common_name, species.kinyarwanda_name].map(normalizeName).filter(Boolean)
  if (names.includes(typed)) return 'exact'
  return names.some((name) => isSimilar(name, typed)) ? 'similar' : null
}

// { exact, similar } from a list of species (the phone's saved copy)
export function findMatches(list, typedName) {
  let exact = null
  const similar = []
  for (const species of list) {
    const match = compareSpecies(species, typedName)
    if (match === 'exact' && !exact) exact = species
    else if (match) similar.push(species)
  }
  return { exact, similar: similar.slice(0, 5) }
}

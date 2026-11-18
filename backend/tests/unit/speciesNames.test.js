// Name comparison used to prevent duplicate species (no database needed).
const { normalizeName, isSimilar, compareSpecies } = require('../../src/utils/speciesNames');
const { suggestStage, stageAfterDates } = require('../../src/services/batchDates');

describe('normalizeName', () => {
  test('ignores case, spaces, punctuation and accents', () => {
    expect(normalizeName('  Grévillea   ROBUSTA ')).toBe('grevillearobusta');
    expect(normalizeName('Rosa (rose)')).toBe(normalizeName('rosa-ROSE'));
  });
});

describe('isSimilar / compareSpecies', () => {
  test('a contained name or a small typing mistake is similar; a different plant is not', () => {
    expect(isSimilar('grevillea', 'grevillearobusta')).toBe(true);
    expect(isSimilar('jacaranda', 'jakaranda')).toBe(true);
    expect(isSimilar('rose', 'pine')).toBe(false);
    expect(isSimilar('fig', 'fir')).toBe(false); // very short names need to match exactly
  });
  test('the local name counts too', () => {
    const species = { common_name: 'Rose (Rosa)', kinyarwanda_name: 'Iroza' };
    expect(compareSpecies(species, 'iroza')).toBe('exact');
    expect(compareSpecies(species, 'Rose')).toBe('similar');
    expect(compareSpecies(species, 'Avocado')).toBeNull();
  });
});

describe('dates after approval', () => {
  test('no dates (species waiting) -> no suggested stage', () => {
    expect(suggestStage({ planting_date: '2026-01-01', expected_ready_date: null, prime_end_date: null })).toBeNull();
  });
  test('a batch planted long ago moves forward to overgrown; it never moves back, cleared stays', () => {
    const old = { planting_date: '2025-01-01', expected_ready_date: '2025-04-01', prime_end_date: '2025-05-01' };
    expect(stageAfterDates('seedling', old)).toBe('overgrown');
    const recent = { planting_date: '2099-01-01', expected_ready_date: '2099-06-01', prime_end_date: '2099-07-01' };
    expect(stageAfterDates('ready', recent)).toBe('ready');
    expect(stageAfterDates('cleared', old)).toBe('cleared');
  });
});

// Admin Sales page (docs/DEVIATIONS.md W45): period ranges, the shared filter and CSV safety.
// No database needed: only the pure helpers are called.
const { periodRange, buildFilter, csvCell } = require('../../src/services/salesReportService');

describe('periodRange (Kigali calendar days)', () => {
  test('today, month and year end today', () => {
    expect(periodRange('today', {}, '2026-11-18')).toEqual({ from: '2026-11-18', to: '2026-11-18' });
    expect(periodRange('month', {}, '2026-11-18')).toEqual({ from: '2026-11-01', to: '2026-11-18' });
    expect(periodRange('year', {}, '2026-11-18')).toEqual({ from: '2026-01-01', to: '2026-11-18' });
  });

  test('a week starts on Monday', () => {
    expect(periodRange('week', {}, '2026-11-18')).toEqual({ from: '2026-11-16', to: '2026-11-18' }); // Wednesday
    expect(periodRange('week', {}, '2026-11-16')).toEqual({ from: '2026-11-16', to: '2026-11-16' }); // Monday
    expect(periodRange('week', {}, '2026-11-22')).toEqual({ from: '2026-11-16', to: '2026-11-22' }); // Sunday
    expect(periodRange('week', {}, '2027-01-01')).toEqual({ from: '2026-12-28', to: '2027-01-01' }); // across the year end
  });

  test('custom uses the given dates; all has no limits', () => {
    expect(periodRange('custom', { from: '2026-02-01', to: '2026-02-28' })).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(periodRange('custom', { from: '2026-02-01' })).toEqual({ from: '2026-02-01', to: null });
    expect(periodRange('all')).toEqual({ from: null, to: null });
  });
});

describe('buildFilter (the same WHERE for totals, breakdowns, rows and CSV)', () => {
  test('removed (archived) sales are always left out', () => {
    expect(buildFilter({ period: 'all' }).where).toBe('WHERE s.archived_at IS NULL');
  });

  test('the end date is inclusive: the range stops at the start of the next Kigali day', () => {
    const { replacements } = buildFilter({ period: 'custom', from: '2026-11-18', to: '2026-11-18' });
    // Kigali is UTC+2: 18 November 00:00 Kigali = 17 November 22:00 UTC
    expect(replacements.start.toISOString()).toBe('2026-11-17T22:00:00.000Z');
    expect(replacements.end.toISOString()).toBe('2026-11-18T22:00:00.000Z');
  });

  test('nursery, species and search are added; % and _ are searched literally', () => {
    const { where, replacements } = buildFilter({ period: 'all', nurseryId: '3', speciesId: 7, search: ' 50%_off ' });
    expect(where).toContain('s.nursery_id = :nurseryId');
    expect(where).toContain('b.species_id = :speciesId');
    expect(replacements).toMatchObject({ nurseryId: 3, speciesId: 7, search: '%50\\%\\_off%' });
  });
});

describe('csvCell', () => {
  test('quotes commas, quotes and new lines', () => {
    expect(csvCell('Kabeza, Kicukiro')).toBe('"Kabeza, Kicukiro"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('');
    expect(csvCell(1500)).toBe('1500');
  });

  test('text that a spreadsheet would run as a formula is made harmless', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+250788')).toBe("'+250788");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell(-5)).toBe('-5'); // a real number stays a number
  });
});

// Public homepage (docs/DEVIATIONS.md W48): who may be published, the progress bar, and that the public
// card holds ONLY the allowed fields. No database needed: only the pure helpers are called.
const { publishBlockReason, primeProgress, publicCard } = require('../../src/services/homepageService');

const okBatch = (overrides = {}) => ({
  id: 7,
  stage: 'ready',
  archived_at: null,
  quantity_current: 120,
  quantity_initial: 150,
  unit_price: 300,
  expected_ready_date: '2026-11-01',
  prime_end_date: '2026-12-01',
  client_uuid: 'secret-uuid',
  species: { id: 1, common_name: 'Grevillea robusta', kinyarwanda_name: 'Gereveliya', category: 'tree', status: 'approved' },
  nursery: {
    id: 3,
    name: 'Kabeza Nursery',
    district: 'Kicukiro',
    sector: 'Kanombe',
    address_text: 'Near the market',
    latitude: -1.97,
    longitude: 30.1,
    verification_status: 'approved',
    show_on_homepage: true,
    archived_at: null,
    owner: { phone: '+250788000000', email: 'owner@example.test' },
  },
  ...overrides,
});

describe('publishBlockReason', () => {
  test('a ready batch with free plants of an approved nursery that agreed can be published', () => {
    expect(publishBlockReason(okBatch(), 10)).toBeNull();
  });

  test('every blocking reason has its own code', () => {
    const n = okBatch().nursery;
    expect(publishBlockReason(okBatch({ archived_at: new Date() }), 10)).toBe('BATCH_ARCHIVED');
    expect(publishBlockReason(okBatch({ nursery: { ...n, archived_at: new Date() } }), 10)).toBe('NURSERY_ARCHIVED');
    expect(publishBlockReason(okBatch({ nursery: { ...n, verification_status: 'pending' } }), 10)).toBe('NURSERY_NOT_APPROVED');
    expect(publishBlockReason(okBatch({ nursery: { ...n, show_on_homepage: false } }), 10)).toBe('NURSERY_NO_CONSENT');
    expect(publishBlockReason(okBatch({ species: { ...okBatch().species, status: 'pending' } }), 10)).toBe('SPECIES_NOT_APPROVED');
    expect(publishBlockReason(okBatch({ stage: 'growing' }), 10)).toBe('NOT_READY');
    expect(publishBlockReason(okBatch({ stage: 'overgrown' }), 10)).toBe('NOT_READY');
    expect(publishBlockReason(okBatch(), 0)).toBe('NO_STOCK');
  });
});

describe('primeProgress (how much of the prime window has passed)', () => {
  test('0 at the ready date, 50 halfway, 100 at or after the end', () => {
    expect(primeProgress('2026-11-01', '2026-12-01', '2026-11-01')).toBe(0);
    expect(primeProgress('2026-11-01', '2026-12-01', '2026-11-16')).toBe(50);
    expect(primeProgress('2026-11-01', '2026-12-01', '2026-12-20')).toBe(100);
    expect(primeProgress('2026-11-01', '2026-12-01', '2026-10-01')).toBe(0);
  });

  test('no dates, no bar', () => {
    expect(primeProgress(null, '2026-12-01')).toBeNull();
  });
});

describe('publicCard exposes only the allowed fields', () => {
  test('species, plant type, quantity available, price, prime-window end, nursery name and district', () => {
    const card = publicCard(okBatch(), 45, '2026-11-16');
    expect(card).toEqual({
      species: { name: 'Grevillea robusta', kinyarwanda_name: 'Gereveliya' },
      category: 'tree',
      available: 45,
      unit_price: 300,
      prime_end_date: '2026-12-01',
      prime_progress: 50,
      nursery: { name: 'Kabeza Nursery', district: 'Kicukiro' },
    });
    const text = JSON.stringify(card);
    for (const hidden of ['phone', 'email', 'Kanombe', 'Near the market', '-1.97', '30.1', 'secret-uuid', '120', '150', 'quantity_current', 'risk', 'sales']) {
      expect(text).not.toContain(hidden);
    }
  });

  test('no price is shown when the nursery entered none', () => {
    expect(publicCard(okBatch({ unit_price: 0 }), 5).unit_price).toBeNull();
  });
});

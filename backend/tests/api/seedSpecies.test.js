// Kigali starter species list (backend/scripts/seed-species.js)
const h = require('../helpers');
const { User, PlantSpecies, AuditLog } = require('../../src/models');
const { SPECIES_CATEGORIES } = require('../../src/utils/constants');
const { DEMO_LABEL } = require('../../src/services/bootstrapService');
const { KIGALI_SPECIES, importSpecies } = require('../../scripts/seed-species');

let adminUser;

beforeAll(async () => {
  await h.resetDatabase();
  await h.adminClient();
  await h.demoSpecies();
  adminUser = await User.findOne({ where: { role: 'admin' } });
});
afterAll(() => h.sequelize.close());

test('every plant in the list is valid and named only once', () => {
  const names = KIGALI_SPECIES.map(([name]) => name.toLowerCase());
  expect(new Set(names).size).toBe(names.length);
  for (const [name, , category, ready, prime] of KIGALI_SPECIES) {
    expect(name.length).toBeLessThanOrEqual(120);
    expect(SPECIES_CATEGORIES).toContain(category);
    expect(Number.isInteger(ready) && ready > 0).toBe(true);
    expect(Number.isInteger(prime) && prime > 0).toBe(true);
  }
});

test('a dry run changes nothing', async () => {
  const before = await PlantSpecies.count({ paranoid: false });
  const result = await importSpecies(adminUser, { dryRun: true, archiveDemo: true });
  expect(result.added).toHaveLength(KIGALI_SPECIES.length);
  expect(await PlantSpecies.count({ paranoid: false })).toBe(before);
});

test('adds the plants, archives the DEMO species and writes the audit log', async () => {
  const result = await importSpecies(adminUser, { archiveDemo: true });
  expect(result.added).toHaveLength(KIGALI_SPECIES.length);
  expect(result.archived.length).toBeGreaterThan(0);
  const active = await PlantSpecies.findAll();
  expect(active).toHaveLength(KIGALI_SPECIES.length);
  expect(active.some((s) => s.common_name.includes(DEMO_LABEL))).toBe(false);
  expect(await AuditLog.count({ where: { action: 'species.created' } })).toBe(KIGALI_SPECIES.length);
});

test('running it again adds nothing', async () => {
  const result = await importSpecies(adminUser, { archiveDemo: true });
  expect(result.added).toHaveLength(0);
  expect(result.skipped).toHaveLength(KIGALI_SPECIES.length);
  expect(result.archived).toHaveLength(0);
});

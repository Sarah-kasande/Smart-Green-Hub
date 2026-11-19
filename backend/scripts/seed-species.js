// Adds a starter list of plants commonly grown by nurseries in and around Kigali.
//
//   cd backend
//   node scripts/seed-species.js --dry-run         (shows what would be added, changes nothing)
//   node scripts/seed-species.js                   (adds the plants to the local database)
//   node scripts/seed-species.js --archive-demo    (also archives the "[DEMO - ...]" species)
//
// LOCAL databases only: it refuses the live database (Neon "neondb" or any remote host), with no
// way around it. On the live site the administrator adds the real species in Rules & Species.
//
// IMPORTANT: the day values below are ESTIMATES for a starting point, not research data.
// Confirm them with nursery operators and correct them in Admin > Rules and species.
// Kinyarwanda names are only filled in where they are well known; the others are left empty
// (TODO: ask a native speaker) and can be added later on the same admin page.
//
// It uses the same service as the admin page, so every plant is validated and written to the
// audit log as a normal administrator action. Plants whose name already exists (even archived)
// are skipped, so running it twice adds nothing the second time.
require('../src/config/env');
const { sequelize, User, PlantSpecies } = require('../src/models');
const admin = require('../src/services/adminService');
const { DEMO_LABEL } = require('../src/services/bootstrapService');
const { dbTarget, describeTarget } = require('../src/utils/dbSafety');

// [common name, Kinyarwanda name or null, category, days to ready (estimate), prime days (estimate)]
// days to ready = from sowing/planting in the nursery until it can be sold
// prime days    = how long it stays at its best before it is too big or root-bound
const KIGALI_SPECIES = [
  // Native and agroforestry trees
  ['Markhamia (Markhamia lutea)', 'Umusave', 'tree', 180, 120],
  ['Grevillea (Grevillea robusta)', null, 'tree', 150, 90], // TODO: Kinyarwanda name to confirm
  ['Podocarpus (Podocarpus latifolius)', null, 'tree', 365, 180], // TODO: Kinyarwanda name to confirm (Umufu?)
  ['Fig tree (Ficus thonningii)', 'Umuvumu', 'tree', 120, 120],
  ['Coral tree (Erythrina abyssinica)', 'Umuko', 'tree', 120, 90],
  ['Polyscias (Polyscias fulva)', 'Umwungo', 'tree', 180, 120],
  ['Maesopsis (Maesopsis eminii)', null, 'tree', 150, 90], // TODO: Kinyarwanda name to confirm (Umuhumuro?)
  ['Cedrela (Cedrela serrata)', null, 'tree', 150, 90], // TODO: Kinyarwanda name to confirm
  ['Alder (Alnus acuminata)', null, 'tree', 150, 90], // TODO: Kinyarwanda name to confirm
  ['Calliandra (Calliandra calothyrsus)', null, 'shrub', 90, 60], // TODO: Kinyarwanda name to confirm
  // Fruit trees
  ['Avocado, grafted (Persea americana)', 'Avoka', 'tree', 240, 120],
  ['Mango, grafted (Mangifera indica)', 'Umwembe', 'tree', 270, 120],
  ['Orange, grafted (Citrus sinensis)', 'Icunga', 'tree', 300, 150],
  ['Lemon (Citrus limon)', 'Indimu', 'tree', 300, 150],
  ['Macadamia, grafted (Macadamia integrifolia)', null, 'tree', 365, 180], // TODO: Kinyarwanda name to confirm
  ['Papaya (Carica papaya)', 'Ipapayi', 'tree', 75, 30],
  ['Tree tomato (Solanum betaceum)', 'Ibinyomoro', 'shrub', 90, 45],
  ['Passion fruit (Passiflora edulis)', 'Marakuja', 'other', 60, 30],
  // Shade and street trees
  ['Jacaranda (Jacaranda mimosifolia)', null, 'tree', 180, 120], // TODO: Kinyarwanda name to confirm
  ['Flamboyant (Delonix regia)', null, 'tree', 180, 120], // TODO: Kinyarwanda name to confirm
  ['Cypress (Cupressus lusitanica)', null, 'tree', 180, 120], // TODO: Kinyarwanda name to confirm
  // Hedges and shrubs
  ['Golden duranta (Duranta erecta)', null, 'shrub', 90, 90], // TODO: Kinyarwanda name to confirm
  ['Bougainvillea (Bougainvillea spectabilis)', null, 'shrub', 120, 90], // TODO: Kinyarwanda name to confirm
  ['Hibiscus (Hibiscus rosa-sinensis)', null, 'shrub', 90, 90], // TODO: Kinyarwanda name to confirm
  ['Ixora (Ixora coccinea)', null, 'shrub', 120, 90], // TODO: Kinyarwanda name to confirm
  ['Croton (Codiaeum variegatum)', null, 'shrub', 120, 90], // TODO: Kinyarwanda name to confirm
  ['Thuja (Thuja occidentalis)', null, 'shrub', 240, 180], // TODO: Kinyarwanda name to confirm
  ['Dracaena (Dracaena fragrans)', null, 'other', 120, 120], // TODO: Kinyarwanda name to confirm
  // Flowers
  ['Rose (Rosa)', 'Iroza', 'flower', 120, 60],
  ['Canna lily (Canna indica)', null, 'flower', 60, 45], // TODO: Kinyarwanda name to confirm
  ['Agapanthus (Agapanthus praecox)', null, 'flower', 120, 90], // TODO: Kinyarwanda name to confirm
  ['Bird of paradise (Strelitzia reginae)', null, 'flower', 365, 180], // TODO: Kinyarwanda name to confirm
  ['Geranium (Pelargonium)', null, 'flower', 60, 45], // TODO: Kinyarwanda name to confirm
  ['Marigold (Tagetes)', null, 'flower', 45, 21], // TODO: Kinyarwanda name to confirm
  ['Petunia (Petunia hybrida)', null, 'flower', 45, 21], // TODO: Kinyarwanda name to confirm
];

// Adds the missing plants and (optionally) archives the DEMO species. Returns what it did.
async function importSpecies(adminUser, { archiveDemo = false, dryRun = false } = {}) {
  const existing = await PlantSpecies.findAll({ paranoid: false });
  const names = new Set(existing.map((s) => s.common_name.toLowerCase()));
  const added = [];
  const skipped = [];
  for (const [common_name, kinyarwanda_name, category, default_days_to_ready, default_prime_days] of KIGALI_SPECIES) {
    if (names.has(common_name.toLowerCase())) {
      skipped.push(common_name);
      continue;
    }
    if (!dryRun) await admin.saveSpecies(adminUser, { common_name, kinyarwanda_name, category, default_days_to_ready, default_prime_days });
    added.push(common_name);
  }
  // Archived species disappear from the "new batch" list, but existing batches keep showing their name.
  const demo = archiveDemo ? existing.filter((s) => !s.archived_at &&s.common_name.includes(DEMO_LABEL)) : [];
  if (!dryRun) {
    for (const s of demo) await admin.archiveSpecies(adminUser, s.id, 'Replaced by the Kigali starter species list');
  }
  return { added, skipped, archived: demo.map((s) => s.common_name) };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const target = dbTarget();
  if (target.live) {
    console.error(`STOP: this script never writes to the live ${describeTarget(target)}. On the live site the administrator adds species in Rules & Species.`);
    process.exit(1);
  }
  const adminUser = await User.findOne({ where: { role: 'admin' } });
  if (!adminUser) {
    console.error('No administrator yet: start the API once (npm run dev) so it is created, then run this again.');
    process.exit(1);
  }
  const result = await importSpecies(adminUser, { archiveDemo: args.includes('--archive-demo'), dryRun });
  const verb = dryRun ? 'Would add' : 'Added';
  console.log(`${verb} ${result.added.length} plants:`);
  for (const name of result.added) console.log('  + ' + name);
  if (result.skipped.length) console.log(`Skipped ${result.skipped.length} that already exist.`);
  if (result.archived.length) console.log(`${dryRun ? 'Would archive' : 'Archived'} ${result.archived.length} DEMO species.`);
  console.log('Remember: the day values are estimates. Confirm them with nursery operators in Admin > Rules and species.');
  await sequelize.close();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Adding species failed:', error.message);
    process.exit(1);
  });
}

module.exports = { KIGALI_SPECIES, importSpecies };

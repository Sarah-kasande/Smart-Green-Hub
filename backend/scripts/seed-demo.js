// DEMO DATA for presentations (local database by default).
//
//   cd backend
//   DEMO_PASSWORD=<password for the demo accounts> node scripts/seed-demo.js [--fill=<operator email>]
//
// What it creates (every organisation name starts with "[DEMO]", every note says "demo"):
//  - one more approved nursery, one pending nursery, four approved institutions, one pending institution
//  - batches, sales and expenses over the last four months, a stock change, surplus listings,
//    requests in every state (pending, approved, declined, fulfilled) and completed hand-overs
//  - the risk check, so alerts appear; notifications for every event
// --fill=<email>: the batches, sales, expenses and listings go to that EXISTING approved nursery
//   (for example your own demo operator account). Without it, a "[DEMO]" nursery is created.
//
// It uses the same services as the app, so stock, reservations, hand-overs, impact records and the
// audit log follow the real rules. Only the dates of past events are moved back afterwards, so the
// charts show several months. No email is sent: emails are marked "skipped".
// It refuses to run on the production (Aiven) database unless --allow-production is given, and it
// stops if the demo data already exists.
require('../src/config/env');
// No real emails for demo events (they would go to fake @example.test addresses)
delete process.env.BREVO_API_KEY;

const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');
const { sequelize, User, Nursery, Institution, PlantSpecies } = require('../src/models');
const { BCRYPT_ROUNDS } = require('../src/services/authService');
const audit = require('../src/services/auditService');
const verification = require('../src/services/verificationService');
const inventory = require('../src/services/inventoryService');
const finance = require('../src/services/financeService');
const surplus = require('../src/services/surplusService');
const risk = require('../src/services/riskService');
const notifications = require('../src/services/notificationService');
const { todayKigali, addDays } = require('../src/utils/dates');

const args = process.argv.slice(2);
const fillEmail = (args.find((a) => a.startsWith('--fill=')) || '').slice('--fill='.length).trim().toLowerCase();
const allowProduction = args.includes('--allow-production');
const TODAY = todayKigali();
// A date N days before today, and a time on that day (10:00 Kigali)
const daysAgo = (n) => addDays(TODAY, -n);
const at = (n) => new Date(`${daysAgo(n)}T10:00:00+02:00`);

function stop(message) {
  console.error(message);
  process.exit(1);
}

async function makeUser({ role, full_name, email, password }) {
  const user = await User.create({
    role,
    full_name,
    email,
    password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    email_verified_at: new Date(), // demo accounts skip the email code
    preferred_language: 'en',
  });
  await audit.log({ actorId: null, action: 'user.registered', entityType: 'user', entityId: user.id, reason: 'demo data' });
  return user;
}

async function makeNursery(owner, data) {
  const nursery = await Nursery.create({ owner_id: owner.id, ...data });
  await audit.log({ actorId: owner.id, action: 'nursery.registered', entityType: 'nursery', entityId: nursery.id, reason: 'demo data' });
  return nursery;
}

async function makeInstitution(user, data) {
  const institution = await Institution.create({ user_id: user.id, ...data });
  await audit.log({ actorId: user.id, action: 'institution.registered', entityType: 'institution', entityId: institution.id, reason: 'demo data' });
  return institution;
}

async function main() {
  const host = (process.env.DB_HOST || '').toLowerCase();
  if (host.includes('aivencloud.com') && !allowProduction) {
    stop('STOP: this is the production (Aiven) database. Demo data is meant for the local database.\nAdd --allow-production only if you really want demo data on the live site.');
  }
  const password = process.env.DEMO_PASSWORD || '';
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) stop('Set DEMO_PASSWORD (at least 8 characters with a letter and a number) for the demo accounts.');
  if (await User.findOne({ where: { email: 'demo-school@example.test' }, paranoid: false })) stop('Demo data already exists. Nothing changed.');

  const admin = await User.findOne({ where: { role: 'admin' } });
  if (!admin) stop('No administrator yet: start the API once (npm run dev) so it is created, then run this again.');

  const speciesRows = await PlantSpecies.findAll();
  const species = (word) => {
    const found = speciesRows.find((s) => s.common_name.toLowerCase().includes(word));
    if (!found) stop(`Species "${word}" not found. Start the API once so the DEMO species are created.`);
    return found;
  };

  // ---- Main nursery: an existing account (--fill) or a new [DEMO] one ----
  let mainUser;
  let main;
  if (fillEmail) {
    mainUser = await User.findOne({ where: { email: fillEmail, role: 'operator' } });
    if (!mainUser) stop('No nursery operator with that email.');
    main = await Nursery.findOne({ where: { owner_id: mainUser.id } });
    if (main.verification_status !== 'approved') stop('That nursery is not approved yet: approve it first in the Verification queue.');
    const [{ n }] = await sequelize.query('SELECT COUNT(*) AS n FROM batches WHERE nursery_id = :id', { replacements: { id: main.id }, type: QueryTypes.SELECT });
    if (Number(n) > 0) stop('That nursery already has batches. Nothing changed.');
    // A map pin, so the nursery appears on the Surplus Board map (only if it has none)
    if (main.latitude === null) {
      const pins = { Gasabo: [-1.9441, 30.0950], Kicukiro: [-1.9706, 30.1044], Nyarugenge: [-1.9536, 30.0605] };
      const [lat, lng] = pins[main.district] || pins.Gasabo;
      await main.update({ latitude: lat, longitude: lng });
    }
  } else {
    mainUser = await makeUser({ role: 'operator', full_name: 'Demo Nursery Operator', email: 'demo-nursery@example.test', password });
    main = await makeNursery(mainUser, { name: '[DEMO] Kabeza Green Nursery', district: 'Kicukiro', sector: 'Kanombe', address_text: 'Near Kabeza market (demo)', is_listed: true, latitude: -1.9706, longitude: 30.1044 });
    await verification.decide({ adminId: admin.id, type: 'nursery', id: main.id, decision: 'approve' });
  }

  // ---- Other organisations ----
  const remeraUser = await makeUser({ role: 'operator', full_name: 'Demo Remera Operator', email: 'demo-remera@example.test', password });
  const remera = await makeNursery(remeraUser, { name: '[DEMO] Remera Flowers & Trees', district: 'Gasabo', sector: 'Remera', address_text: 'Remera, near the stadium (demo)', is_listed: true, latitude: -1.9547, longitude: 30.1061 });
  await verification.decide({ adminId: admin.id, type: 'nursery', id: remera.id, decision: 'approve' });

  const waitingUser = await makeUser({ role: 'operator', full_name: 'Demo Waiting Operator', email: 'demo-waiting@example.test', password });
  await makeNursery(waitingUser, { name: '[DEMO] Nyamirambo Seedlings', district: 'Nyarugenge', sector: 'Nyamirambo', is_listed: false });

  const inst = {};
  const institutions = [
    ['school', 'Demo School Contact', 'demo-school@example.test', '[DEMO] Green Valley School', 'school', 'Gasabo', 'Kimironko', '0788000001'],
    ['church', 'Demo Church Contact', 'demo-church@example.test', '[DEMO] Hope Community Church', 'church', 'Kicukiro', 'Gikondo', '0788000002'],
    ['group', 'Demo Group Contact', 'demo-group@example.test', '[DEMO] Umuganda Greening Group', 'community_group', 'Kicukiro', 'Niboye', '0788000003'],
    ['hotel', 'Demo Hotel Contact', 'demo-hotel@example.test', '[DEMO] Hill View Hotel', 'hotel', 'Nyarugenge', 'Nyarugenge', '0788000004'],
  ];
  for (const [key, full_name, email, org_name, org_type, district, sector, contact_phone] of institutions) {
    const user = await makeUser({ role: 'institution', full_name, email, password });
    inst[key] = { user, org: await makeInstitution(user, { org_name, org_type, district, sector, contact_phone }) };
    await verification.decide({ adminId: admin.id, type: 'institution', id: inst[key].org.id, decision: 'approve' });
  }
  const officeUser = await makeUser({ role: 'institution', full_name: 'Demo Sector Contact', email: 'demo-sector@example.test', password });
  await makeInstitution(officeUser, { org_name: '[DEMO] Example Sector Office', org_type: 'sector_office', district: 'Gasabo', sector: 'Kacyiru', contact_phone: '0788000005' });

  // ---- Batches (planting dates in the past, so stages and prime windows differ) ----
  const batch = async (nursery, owner, word, quantity, plantedDaysAgo, unitPrice) =>
    (await inventory.createBatch(nursery, owner, { species_id: species(word).id, quantity, planting_date: daysAgo(plantedDaysAgo), unit_price: unitPrice })).batch;

  // Ages chosen with the DEMO species defaults (ready after 180 days, prime window 60 days):
  const grevillea = await batch(main, mainUser, 'grevillea', 260, 281, 500); // prime window ended -> overgrown, High
  const jacaranda = await batch(main, mainUser, 'jacaranda', 220, 217, 800); // ready, ~23 days left -> Medium
  const avocado = await batch(main, mainUser, 'avocado', 120, 196, 1500); // ready, ~44 days left, selling well -> Low
  const moringa = await batch(main, mainUser, 'moringa', 150, 144, 400); // growing, selling well -> Low
  const bougainvillea = await batch(main, mainUser, 'bougainvillea', 120, 245, 600); // prime window just ended -> High
  const rosa = await batch(remera, remeraUser, 'rosa', 150, 236, 300); // ~4 days left -> High
  const remeraJacaranda = await batch(remera, remeraUser, 'jacaranda', 100, 161, 800); // growing -> Low

  // ---- Sales over four months (more in the last 28 days for some batches) ----
  const sales = [
    [main, mainUser, grevillea, [[123, 25], [105, 30], [87, 20], [69, 25], [48, 20], [21, 15], [7, 10]]],
    [main, mainUser, jacaranda, [[110, 12], [83, 15], [43, 15], [24, 20], [17, 18], [10, 22], [3, 18]]],
    [main, mainUser, avocado, [[120, 10], [64, 19], [23, 12], [13, 10], [4, 9]]],
    [main, mainUser, moringa, [[22, 15], [9, 15]]],
    [main, mainUser, bougainvillea, [[59, 10], [38, 10]]],
    [remera, remeraUser, rosa, [[95, 30], [54, 20], [18, 20], [6, 20]]],
    [remera, remeraUser, remeraJacaranda, [[13, 25]]],
  ];
  for (const [nursery, owner, b, list] of sales) {
    for (const [ago, quantity] of list) {
      await finance.recordSale(nursery, owner, { batch_id: b.id, quantity, sold_at: at(ago), customer_note: 'Walk-in customer (demo)' });
    }
  }

  // ---- Expenses ----
  const expenses = [
    [125, 'seeds', 25000], [114, 'labour', 60000], [100, 'water', 8000], [83, 'labour', 60000], [72, 'fertiliser', 15000],
    [52, 'labour', 60000], [35, 'pesticide', 7000], [22, 'labour', 60000], [15, 'water', 8000], [8, 'transport', 12000], [3, 'tools', 9000],
  ];
  for (const [ago, category, amount] of expenses) {
    await finance.recordExpense(main, mainUser, { category, amount, spent_at: daysAgo(ago), note: 'Demo expense' });
  }
  await finance.recordExpense(remera, remeraUser, { category: 'water', amount: 6000, spent_at: daysAgo(12), note: 'Demo expense' });

  // ---- A stock change with a reason ----
  await inventory.adjustStock(main, mainUser, { batch_id: grevillea.id, quantity_change: -10, reason: 'Lost to drought (demo)' });

  // ---- Surplus Board listings ----
  const list = (nursery, owner, b, quantity, offer, price, expiresInDays, note) =>
    surplus.createListing(nursery, owner, {
      batch_id: b.id,
      quantity,
      offer_type: offer,
      discounted_price: offer === 'discounted' ? price : null,
      pickup_note: note,
      available_from: TODAY,
      expires_at: addDays(TODAY, expiresInDays),
    });
  const freeBougainvillea = await list(main, mainUser, bougainvillea, 60, 'free', null, 18, 'Pick up at the gate, mornings (demo)');
  const cheapGrevillea = await list(main, mainUser, grevillea, 50, 'discounted', 300, 28, 'Bring your own transport (demo)');
  const cheapRosa = await list(remera, remeraUser, rosa, 60, 'discounted', 200, 13, 'Call before coming (demo)');
  await list(remera, remeraUser, remeraJacaranda, 30, 'free', null, 38, 'Weekdays 8:00-16:00 (demo)');

  // ---- Requests in every state ----
  const ask = async (who, listing, quantity, purpose) => (await surplus.requestPlants(inst[who].org, inst[who].user, listing.id, { quantity, purpose })).request;
  const decide = (nursery, owner, request, decision, reason) => surplus.decideRequest(nursery, owner, request.id, decision, reason);
  const nurseryConfirms = (nursery, owner, request, land) => surplus.confirmHandover({ side: 'nursery', nursery, user: owner, requestId: request.id, details: { land_cleared_sqm: land } });
  const institutionConfirms = (who, request, site, district) =>
    surplus.confirmHandover({ side: 'institution', institution: inst[who].org, user: inst[who].user, requestId: request.id, details: { planting_site: site, planting_district: district } });

  // Completed hand-overs (both sides confirmed) -> impact records
  const done = [];
  const r1 = await ask('school', freeBougainvillea, 20, 'Hedge along the school fence (demo)');
  await decide(main, mainUser, r1, 'approve');
  await nurseryConfirms(main, mainUser, r1, 12);
  await institutionConfirms('school', r1, 'Green Valley School fence line (demo)', 'Gasabo');
  done.push([r1, 43]);

  const r2 = await ask('church', freeBougainvillea, 15, 'Church garden (demo)');
  await decide(main, mainUser, r2, 'approve');
  await nurseryConfirms(main, mainUser, r2, 8);
  await institutionConfirms('church', r2, 'Hope Church garden (demo)', 'Kicukiro');
  done.push([r2, 18]);

  const r7 = await ask('hotel', cheapRosa, 20, 'Hotel entrance garden (demo)');
  await decide(remera, remeraUser, r7, 'approve');
  await nurseryConfirms(remera, remeraUser, r7, 4);
  await institutionConfirms('hotel', r7, 'Hill View Hotel entrance garden (demo)', 'Nyarugenge');
  done.push([r7, 64]);

  // Approved, the nursery confirmed, waiting for the group to confirm receipt
  const r3 = await ask('group', freeBougainvillea, 10, 'Umuganda tree planting day (demo)');
  await decide(main, mainUser, r3, 'approve');
  await nurseryConfirms(main, mainUser, r3, 5);

  // Waiting for the nursery's decision (use these in the live demo)
  await ask('hotel', freeBougainvillea, 5, 'Flower beds by the parking (demo)');
  await ask('school', cheapGrevillea, 30, 'Shade trees for the playground (demo)');

  // Declined with a reason
  const r6 = await ask('group', cheapGrevillea, 10, 'Roadside planting (demo)');
  await decide(main, mainUser, r6, 'decline', 'These plants are reserved for schools this month (demo)');

  // Move the completed hand-overs back in time, so the impact charts show several months
  for (const [request, ago] of done) {
    const when = at(ago);
    await sequelize.query(
      `UPDATE surplus_requests SET created_at = :when, decided_at = :when, nursery_confirmed_at = :when,
              institution_confirmed_at = :when, fulfilled_at = :when WHERE id = :id`,
      { replacements: { when, id: request.id } }
    );
    await sequelize.query('UPDATE impact_records SET recorded_at = :when WHERE request_id = :id', { replacements: { when, id: request.id } });
  }

  // ---- Risk check: creates the alerts (High / Medium / Low) ----
  const summary = await risk.runEvaluation({ actorId: admin.id });

  // Mark the demo emails as "skipped" now (no Brevo key in this script), so the server never sends them
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500)); // let background sends finish first
    const [{ n }] = await sequelize.query("SELECT COUNT(*) AS n FROM notifications WHERE status = 'queued'", { type: QueryTypes.SELECT });
    if (Number(n) === 0) break;
    await notifications.dispatchPending({ limit: 50 });
  }

  console.log('\nDemo data created.');
  console.log(`Main nursery: ${main.name}${fillEmail ? ' (existing account)' : ''}`);
  console.log(`Risk check: ${summary.evaluated} batches, ${summary.high} High, ${summary.medium} Medium, ${summary.low} Low.`);
  console.log('Demo accounts (password = DEMO_PASSWORD):');
  if (!fillEmail) console.log('  demo-nursery@example.test   nursery (main, with data)');
  console.log('  demo-remera@example.test    nursery (second, with data)');
  console.log('  demo-waiting@example.test   nursery waiting for approval');
  console.log('  demo-school@example.test    school (has a request waiting for approval)');
  console.log('  demo-church@example.test    church');
  console.log('  demo-group@example.test     community group (must confirm a hand-over)');
  console.log('  demo-hotel@example.test     hotel');
  console.log('  demo-sector@example.test    sector office waiting for approval');
}

main()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error('Demo data FAILED:', error.message, error.details || '');
    await sequelize.close();
    process.exit(1);
  });

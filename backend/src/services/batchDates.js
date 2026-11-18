// Dates and stage of a batch, calculated ONLY from the administrator's species rules
// (docs/DEVIATIONS.md W39: nurseries no longer adjust growing times or prime windows).
//   ready date       = planting date + species days to ready
//   prime-window end = ready date + prime-window days (a species row in RULE_SETTINGS overrides
//                      the species default, docs/DEVIATIONS.md D8)
// Used when a batch is created, and when a waiting species is approved, merged or replaced.
const { RuleSetting } = require('../models');
const { todayKigali, addDays, daysBetween } = require('../utils/dates');

const STAGE_ORDER = ['seedling', 'growing', 'ready', 'overgrown'];

async function primeDaysFor(species, transaction) {
  const rule = await RuleSetting.findOne({ where: { species_id: species.id }, transaction });
  return rule?.prime_window_days ?? species.default_prime_days;
}

// { planting_date, expected_ready_date, prime_end_date } for an APPROVED species.
// A species that is not approved has no rules yet, so both dates stay empty (NULL).
async function datesFor(species, plantingDate, transaction) {
  if (!species || species.status !== 'approved') {
    return { planting_date: plantingDate, expected_ready_date: null, prime_end_date: null };
  }
  const ready = addDays(plantingDate, species.default_days_to_ready);
  return { planting_date: plantingDate, expected_ready_date: ready, prime_end_date: addDays(ready, await primeDaysFor(species, transaction)) };
}

// The stage the dates suggest. The operator decides the real stage (FR07: the system never
// changes a batch by itself), so this is shown as a hint and used when a batch gets its dates.
//   before the ready date: "seedling" during the first third of the growing time, then "growing"
//   from the ready date to the prime-window end: "ready"
//   after the prime-window end: "overgrown"
// Returns null when the batch has no dates yet (species waiting for approval).
function suggestStage({ planting_date, expected_ready_date, prime_end_date }, today = todayKigali()) {
  if (!expected_ready_date || !prime_end_date) return null;
  if (today > prime_end_date) return 'overgrown';
  if (today >= expected_ready_date) return 'ready';
  const growingDays = Math.max(1, daysBetween(planting_date, expected_ready_date));
  return daysBetween(planting_date, today) < growingDays / 3 ? 'seedling' : 'growing';
}

// Stage when a waiting batch finally gets its dates: the later of the operator's stage and the
// suggested one, never backwards. A batch planted long ago can therefore become "ready" or
// "overgrown" at once (and the risk engine then treats it normally). "cleared" is never changed.
function stageAfterDates(currentStage, dates) {
  const suggested = suggestStage(dates);
  if (currentStage === 'cleared' || !suggested) return currentStage;
  return STAGE_ORDER.indexOf(suggested) > STAGE_ORDER.indexOf(currentStage) ? suggested : currentStage;
}

module.exports = { primeDaysFor, datesFor, suggestStage, stageAfterDates, STAGE_ORDER };

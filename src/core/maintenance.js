import { numericState, stateProblem } from './state.js';

export const maintenanceText = {
  de: { title: 'Wartungsstube', royalTitle: 'Saugfrieds Wartungsstube', subtitle: 'Restwerte laut Roboter · antippen für Sensordetails',
    healthy: 'Kein Wartungshinweis', attention: 'Wartung im Blick behalten', unknown: 'Wartungsdaten prüfen', due: 'Fällig', soon: 'Bald fällig', okay: 'In Ordnung',
    noPercent: 'Prozentwert nicht eingerichtet', remaining: 'Restzeit', percent: 'Restlebensdauer', missingUnit: 'Einheit fehlt', invalid: 'Ungültiger Messwert',
    note: 'Restzeiten sind Gerätezähler, keine Kalendertermine. Nach der Wartung den Zähler in der Geräteintegration zurücksetzen.' },
  en: { title: 'Maintenance', royalTitle: 'Saugfried’s maintenance workshop', subtitle: 'Remaining values reported by the robot · tap for sensor details',
    healthy: 'No maintenance reminder', attention: 'Keep an eye on maintenance', unknown: 'Check maintenance data', due: 'Due', soon: 'Due soon', okay: 'Okay',
    noPercent: 'Percentage not configured', remaining: 'Time remaining', percent: 'Life remaining', missingUnit: 'Unit missing', invalid: 'Invalid reading',
    note: 'Remaining times are device counters, not calendar dates. Reset the counter in the device integration after maintenance.' },
};

export function maintenanceEntities(items = []) {
  return items.flatMap(item => [item.percent, item.remaining]).filter(Boolean);
}

// Do not infer units, lifespan or maintenance dates from device names.
function reading(entity, states, language, percent) {
  if (!entity) return null;
  const state = states[entity];
  const text = maintenanceText[language];
  const problem = stateProblem(state, language);
  if (problem) return { entity, problem };
  const value = numericState(state);
  const unit = state.attributes?.unit_of_measurement;
  if (value === null || value < 0 || percent && (unit !== '%' || value > 100)) return { entity, problem: text.invalid };
  if (typeof unit !== 'string' || !unit.trim()) return { entity, problem: text.missingUnit };
  return { entity, value, unit, display: `${new Intl.NumberFormat(language).format(value)} ${unit}` };
}

export function maintenanceStatus(item, states, language) {
  const percent = reading(item.percent, states, language, true);
  const remaining = reading(item.remaining, states, language, false);
  const valid = percent && !percent.problem;
  const due = valid && percent.value === 0 || remaining && !remaining.problem && remaining.value === 0;
  const soon = valid && percent.value <= (item.warning_below ?? 10);
  const incomplete = !valid || Boolean(remaining?.problem);
  const status = due ? 'due' : soon ? 'soon' : incomplete ? 'unknown' : 'okay';
  return { percent, remaining, status, incomplete };
}

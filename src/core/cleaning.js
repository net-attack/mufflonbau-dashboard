import { translations } from './i18n.js';
import { isCleaningActionUnavailable, isOffline } from './state.js';
import { maintenanceEntities } from './maintenance.js';

export function cleaningEntities(cleaning = {}) {
  return [...['entity', 'battery', 'current_room', 'map'].map(key => cleaning[key]),
    ...Object.values(cleaning.whole_home ?? {}), ...maintenanceEntities(cleaning.maintenance)].filter(Boolean);
}

// UI command names are separate from HA's registered vacuum actions.
export function vacuumCommand(command, state, services) {
  const service = command === 'start_pause'
    ? ['cleaning', 'returning'].includes(state?.state) ? 'pause' : 'start'
    : command === 'return_home' ? 'return_to_base' : command === 'stop' ? 'stop' : null;
  const feature = { start: 8192, pause: 4, stop: 8, return_to_base: 16 }[service];
  if (!service || isOffline(state) || !services?.vacuum?.[service] ||
    !(Number(state.attributes?.supported_features) & feature)) return null;
  return service;
}

export function cleaningHelperAction(entity) {
  return entity.startsWith('script.')
    ? { domain: 'script', service: entity.slice(7) }
    : { domain: 'input_button', service: 'press', entity };
}

export function cleaningCommand(command, cleaning, mode, states, services) {
  const state = states[cleaning.entity];
  const service = vacuumCommand(command, state, services);
  if (!service) return null;
  // Resuming a paused job must retain its scope and mode. Only fresh starts
  // dispatch the selected whole-home helper; never fall back if it is missing.
  if (service === 'start' && state.state !== 'paused' && cleaning.whole_home !== undefined) {
    const entity = cleaning.whole_home[mode];
    return entity && !isCleaningActionUnavailable(entity, states[entity]) ? cleaningHelperAction(entity) : null;
  }
  return { domain: 'vacuum', service, entity: cleaning.entity };
}

const key = value => typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]+/g, '_') : value;
const cleaningLabels = {
  sweeping: 'vacuum', vacuum: 'vacuum', vacuuming: 'vacuum',
  mopping: 'mop', mop: 'mop',
  sweeping_and_mopping: 'vacuumAndMop', vacuum_and_mop: 'vacuumAndMop',
  mopping_after_sweeping: 'mopAfterVacuum', mop_after_vacuum: 'mopAfterVacuum',
};

export function cleaningActivity(state, language) {
  if (isOffline(state) || !['cleaning', 'paused'].includes(state.state)) return null;
  const text = translations[language];
  const attrs = state.attributes ?? {};
  const genius = key(attrs.cleangenius);
  if ([true, 'on', 'routine_cleaning', 'deep_cleaning'].includes(genius)) {
    const sequence = cleaningLabels[key(attrs.cleangenius_mode)];
    return { label: text.cleanGenius, detail: sequence ? text[sequence] : null };
  }
  const mode = cleaningLabels[key(attrs.cleaning_mode)];
  return { label: mode ? text[mode] : text.cleaningTypeUnknown, detail: null };
}

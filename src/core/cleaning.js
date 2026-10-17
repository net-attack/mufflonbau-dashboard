import { translations } from './i18n.js';
import { isOffline } from './state.js';

export function cleaningEntities(cleaning = {}) {
  return ['entity', 'battery', 'current_room', 'map'].map(key => cleaning[key]).filter(Boolean);
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

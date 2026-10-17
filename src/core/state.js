import { localized, translations } from './i18n.js';
export function availability(state) {
  if (!state) return 'missing';
  if (state.state === 'unavailable') return 'unavailable';
  if (state.state == null || state.state === 'unknown') return 'unknown';
  return 'available';
}
export function stateProblem(state, language) {
  const status = availability(state);
  return status === 'available' ? null : translations[language][status];
}
export function isOffline(state) {
  return availability(state) !== 'available';
}
export function numericState(state) {
  if (isOffline(state) || !['string', 'number'].includes(typeof state.state) || String(state.state).trim() === '') return null;
  const value = Number(state.state);
  return Number.isFinite(value) ? value : null;
}
export function monitorWarnings(monitors, states, language) {
  const text = translations[language];
  return monitors.flatMap(monitor => {
    const state = states[monitor.entity];
    const name = localized(monitor.name, language) || state?.attributes?.friendly_name || monitor.entity;
    if (isOffline(state)) return [{ entity: monitor.entity, name, detail: stateProblem(state, language) }];
    const value = numericState(state);
    const battery = monitor.battery_below !== undefined || /battery/i.test(`${monitor.entity} ${name} ${state.attributes?.device_class ?? ''}`);
    const numeric = battery || state.attributes?.unit_of_measurement !== undefined ||
      ['apparent_power', 'current', 'distance', 'duration', 'energy', 'frequency', 'gas', 'humidity', 'illuminance', 'power', 'pressure', 'signal_strength', 'temperature', 'voltage'].includes(state.attributes?.device_class);
    if (numeric && value === null) return [{ entity: monitor.entity, name, detail: text.invalidValue }];
    const batteryLimit = monitor.battery_below ?? 20;
    if (battery && (value < batteryLimit || value > 100)) {
      return [{ entity: monitor.entity, name, detail: value > 100 ? text.invalidValue : `${text.battery}: ${value}%` }];
    }
    return [];
  });
}
export function appearanceMode(appearance = {}, states = {}, darkMode = false) {
  if (appearance.mode && appearance.mode !== 'auto') return appearance.mode;
  if (states['sun.sun']?.state === 'above_horizon') return 'ambient';
  if (states['sun.sun']?.state === 'below_horizon') return 'night';
  return darkMode ? 'night' : 'ambient';
}

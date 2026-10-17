import { localized, translations } from './i18n.js';
export function isOffline(state) {
  return !state || ['unknown', 'unavailable'].includes(state.state);
}
export function numericState(state) {
  if (isOffline(state) || String(state.state).trim() === '') return null;
  const value = Number(state.state);
  return Number.isFinite(value) ? value : null;
}
export function monitorWarnings(monitors, states, language) {
  const text = translations[language];
  return monitors.flatMap(monitor => {
    const state = states[monitor.entity];
    const name = localized(monitor.name, language) || state?.attributes?.friendly_name || monitor.entity;
    if (isOffline(state)) return [{ entity: monitor.entity, name, detail: text.offline }];
    const value = numericState(state);
    if (monitor.battery_below !== undefined && (value === null || value < monitor.battery_below)) {
      return [{ entity: monitor.entity, name, detail: value === null ? text.offline : `${text.battery}: ${value}%` }];
    }
    return [];
  });
}
export function appearanceMode(appearance = {}, states = {}, darkMode = false) {
  if (appearance.mode && appearance.mode !== 'auto') return appearance.mode;
  if (appearance.night_person) {
    return states[appearance.night_person]?.state === 'home' &&
      states[appearance.ambient_person]?.state !== 'home' ? 'night' : 'ambient';
  }
  return darkMode ? 'night' : 'ambient';
}

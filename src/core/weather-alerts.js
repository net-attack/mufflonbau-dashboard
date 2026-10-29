import { isOffline, stateProblem } from './state.js';

export const warningHash = '#mufflonbau-weather-warnings';
export const radarHash = '#mufflonbau-rain-radar';

export function alertSnapshot(state, now = Date.now()) {
  const available = !isOffline(state);
  const warnings = (available && Array.isArray(state.attributes?.warnings) ? state.attributes.warnings : [])
    .filter(w => w && typeof w.title === 'string' && Number(w.level) > 0 &&
      (!w.end || !Number.isFinite(Date.parse(w.end)) || Date.parse(w.end) > now))
    .sort((a, b) => Number(b.level) - Number(a.level) || a.title.localeCompare(b.title));
  const problems = Array.isArray(state?.attributes?.problems) ? [...new Set(state.attributes.problems.filter(p => typeof p === 'string' && p.trim()))] : [];
  return { available: Boolean(available), warnings, problems };
}

export function weatherSystemWarning(config, state, language) {
  if (!config) return null;
  const { available, problems } = alertSnapshot(state);
  const details = [...new Set([!available && stateProblem(state, language), ...problems].filter(Boolean))];
  return details.length ? { entity: config.entity, name: 'NINA & DWD', detail: details.join(' · ') } : null;
}

export function weatherPopups(config, language, appearance) {
  if (!config) return [];
  const de = language === 'de';
  const popup = (hash, name, icon, mode) => ({
    type: 'custom:bubble-card', card_type: 'pop-up', hash, name, icon,
    popup_mode: 'adaptive-dialog', width_desktop: 'min(760px, 94vw)',
    styles: '.bubble-pop-up { --bubble-pop-up-main-background-color: var(--mb-surface); --bubble-main-background-color: var(--mb-soft); color: var(--mb-ink); }',
    close_by_clicking_outside: true,
    cards: [{ type: 'custom:mufflonbau-weather-alerts', mode, weather_alerts: config, language, appearance }],
  });
  return [popup(warningHash, de ? 'Warnungen' : 'Warnings', 'mdi:alert-outline', 'details'),
    ...(config.radar ? [popup(radarHash, de ? 'DWD Regenradar' : 'DWD rain radar', 'mdi:radar', 'radar')] : [])];
}

export function openWeatherPopup(hash) {
  if (window.location.hash === hash) return;
  window.history.pushState(null, '', hash);
  window.dispatchEvent(new Event('location-changed'));
  window.dispatchEvent(new Event('hashchange'));
}

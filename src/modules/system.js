import { collectEntities } from '../core/config.js';
import { adminGroups, discoverAdminSources, numericGroups } from '../core/admin.js';
import { liveCard, view } from '../core/cards.js';
import { categorizeEntities } from '../core/expert.js';
export function systemViews({ config, hass, text, language }) {
  const views = [];
  if (config.monitors.length) views.push(view('system', text.system, 'mdi:alert-circle-outline', [
    liveCard('warnings', { monitors: config.monitors, appearance: config.appearance }, language),
  ]));
  const admin = discoverAdminSources(config.admin, hass.states);
  const entities = [...new Set([...collectEntities(config), ...Object.values(admin).flat()])];
  const adminCard = section => ({ expert_available: entities.length > 0, type: 'custom:mufflonbau-admin', section, admin, language, appearance: config.appearance });
  views.push(view('admin', text.admin, 'mdi:server-network', [adminCard('overview')]));
  for (const group of adminGroups) {
    views.push(view(`admin-${group}`, text[group], 'mdi:server-network', [
      adminCard(group),
      ...numericGroups(admin[group], hass.states).map(entities => ({
        type: 'custom:mufflonbau-history', entities, language, internet_rate: group === 'internet', appearance: config.appearance,
      })),
    ], { subview: true }));
  }
  if (entities.length) views.push(view('expert', text.expert, 'mdi:tune-variant', [{
    ...adminCard('expert'), entities, entries: categorizeEntities(entities, { ...config, admin }, hass.states),
  }], { subview: true }));
  return views;
}

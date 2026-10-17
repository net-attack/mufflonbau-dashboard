import { collectEntities } from '../core/config.js';
import { adminGroups, numericGroups } from '../core/admin.js';
import { entityList, liveCard, view } from '../core/cards.js';
export function systemViews({ config, hass, text, language }) {
  const views = [];
  if (config.monitors.length) views.push(view('system', text.system, 'mdi:alert-circle-outline', [
    liveCard('warnings', { monitors: config.monitors, appearance: config.appearance }, language),
    ...entityList(config.monitors.map(monitor => monitor.entity), text.system),
  ]));
  const entities = collectEntities(config);
  const adminCard = section => ({ expert_available: entities.length > 0, type: 'custom:mufflonbau-admin', section, admin: config.admin, language, appearance: config.appearance });
  views.push(view('admin', text.admin, 'mdi:server-network', [adminCard('overview')]));
  for (const group of adminGroups) {
    views.push(view(`admin-${group}`, text[group], 'mdi:server-network', [
      adminCard(group),
      ...numericGroups(config.admin[group], hass.states).map(entities => ({
        type: 'custom:mufflonbau-history', entities, language, appearance: config.appearance,
      })),
    ], { subview: true }));
  }
  if (entities.length) views.push(view('expert', text.expert, 'mdi:tune-variant', entityList(entities, text.expert), { subview: true }));
  return views;
}

import { collectEntities } from '../core/config.js';
import { entityList, liveCard, view } from '../core/cards.js';
export function systemViews({ config, text, language }) {
  const views = [];
  if (config.monitors.length) views.push(view('system', text.system, 'mdi:alert-circle-outline', [
    liveCard('warnings', { monitors: config.monitors, appearance: config.appearance }, language),
    ...entityList(config.monitors.map(monitor => monitor.entity), text.system),
  ]));
  const entities = collectEntities(config);
  if (entities.length) views.push(view('expert', text.expert, 'mdi:tune-variant', entityList(entities, text.expert)));
  return views;
}

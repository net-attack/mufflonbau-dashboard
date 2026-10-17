import { localized } from '../core/i18n.js';
import { entityList, view } from '../core/cards.js';
export function cleaningViews({ config, text, language }) {
  if (!config.cleaning && !config.rooms.some(room => room.cleaning)) return [];
  const cleaning = config.cleaning ?? {};
  const cards = [];
  if (cleaning.entity) cards.push({ type: 'tile', entity: cleaning.entity, features: [{ type: 'vacuum-commands', commands: ['start_pause', 'stop', 'return_home'] }] });
  if (cleaning.map) cards.push({ type: 'picture-entity', entity: cleaning.map, camera_view: 'live', show_name: false, show_state: false });
  cards.push(...entityList([cleaning.battery, cleaning.current_room].filter(Boolean), text.cleaning));
  for (const room of config.rooms) {
    const actions = Object.entries(room.cleaning ?? {});
    if (!actions.length) continue;
    cards.push({ type: 'grid', title: localized(room.name, language), columns: 2, square: false,
      cards: actions.map(([kind, entity]) => ({ type: 'button', entity, name: text[kind],
        icon: kind === 'vacuum' ? 'mdi:vacuum' : 'mdi:water',
        tap_action: { action: 'perform-action', perform_action: 'input_button.press', target: { entity_id: entity } },
        hold_action: { action: 'more-info' } })) });
  }
  return [view('cleaning', text.cleaning, 'mdi:robot-vacuum', cards)];
}

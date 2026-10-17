import { view } from '../core/cards.js';
export function cleaningViews({ config, text, language }) {
  if (!config.cleaning && !config.rooms.some(room => room.cleaning)) return [];
  const cleaning = config.cleaning ?? {};
  const cards = [];
  if (cleaning.entity || cleaning.battery || cleaning.current_room || config.rooms.some(room => Object.keys(room.cleaning ?? {}).length)) {
    cards.push({ type: 'custom:mufflonbau-cleaning', cleaning, rooms: config.rooms, language, appearance: config.appearance });
  }
  if (cleaning.map) cards.push({ type: 'picture-entity', entity: cleaning.map, camera_view: 'live', show_name: false, show_state: false });
  if (cleaning.maintenance?.length) cards.push({ type: 'custom:mufflonbau-maintenance', cleaning, language, appearance: config.appearance });
  return [view('cleaning', text.cleaning, 'mdi:robot-vacuum', cards)];
}

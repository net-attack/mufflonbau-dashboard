import { localized } from '../core/i18n.js';
import { entityCards, entityList, liveCard, view } from '../core/cards.js';
export function roomViews(context) {
  const { config, text, language } = context;
  if (!config.rooms.length) return [];
  const overview = view('rooms', text.rooms, 'mdi:floor-plan', [
    liveCard('floorplan', { rooms: config.rooms, walls: config.floorplan_walls, appearance: config.appearance }, language),
    liveCard('climate', { rooms: config.rooms, appearance: config.appearance }, language),
  ]);
  return [overview, ...config.rooms.map(room => view(`room-${room.id}`, localized(room.name, language), room.icon ?? 'mdi:door', [
    liveCard('climate', { rooms: [room], appearance: config.appearance }, language),
    ...entityCards(room.lights), ...entityCards(room.entities),
    ...(room.note ? [{ type: 'markdown', content: localized(room.note, language) }] : []),
  ], { subview: true }))];
}
export function climateViews({ config, text, language }) {
  const rooms = config.rooms.filter(room => room.temperature || room.humidity || room.dew_point);
  if (!rooms.length) return [];
  return [view('climate', text.climate, 'mdi:home-thermometer-outline', rooms.flatMap(room => {
    const ids = [room.temperature, room.humidity, room.dew_point].filter(Boolean);
    return [liveCard('climate', { rooms: [room], appearance: config.appearance }, language),
      ...entityList(ids, localized(room.name, language)),
      { type: 'history-graph', title: `${localized(room.name, language)} · ${text.history}`, hours_to_show: 24, entities: ids }];
  }))];
}

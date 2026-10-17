import { localized } from '../core/i18n.js';
import { entityCards, liveCard, view } from '../core/cards.js';
export function roomViews(context) {
  const { config, text, language } = context;
  if (!config.rooms.length) return [];
  const plan = { rooms: config.rooms, walls: config.floorplan_walls, drawing: config.floorplan_drawing, bounds: config.floorplan_bounds, objects: config.floorplan_objects, appearance: config.appearance };
  const overview = view('rooms', text.rooms, 'mdi:floor-plan', [
    liveCard('floorplan', { ...plan, map_only: true }, language),
  ], { fullView: true });
  return [overview, ...config.rooms.map(room => view(`room-${room.id}`, localized(room.name, language), room.icon ?? 'mdi:door', [
    ...(config.floorplan_drawing?.length ? [liveCard('floorplan', { ...plan, focus_room: room.id }, language)] : []),
    liveCard('climate', { rooms: [room], appearance: config.appearance }, language),
    ...entityCards(room.lights), ...entityCards(room.entities),
    ...(room.note ? [{ type: 'markdown', content: localized(room.note, language) }] : []),
  ], { subview: true }))];
}
export function climateViews({ config, text, language }) {
  const rooms = config.rooms.filter(room => room.temperature || room.humidity || room.dew_point);
  if (!rooms.length && !config.weather && !config.weather_alerts) return [];
  return [view('climate', text.climate, 'mdi:home-thermometer-outline', [
    ...(config.weather ? [{ type: 'weather-forecast', entity: config.weather, name: language === 'de' ? 'Wetter' : 'Weather',
      show_current: true, show_forecast: true, forecast_type: 'daily', forecast_slots: 5 }] : []),
    ...(config.weather_alerts ? [{ type: 'custom:mufflonbau-weather-alerts', mode: 'status',
      weather_alerts: config.weather_alerts, appearance: config.appearance, language }] : []),
    ...(rooms.length ? [liveCard('climate', { rooms, layout: 'table', appearance: config.appearance }, language)] : []),
    ...rooms.map(room => {
      const ids = [room.temperature, room.humidity, room.dew_point].filter(Boolean);
      return { type: 'history-graph', title: `${localized(room.name, language)} · ${text.history}`, hours_to_show: 24, entities: ids };
    }),
  ])];
}

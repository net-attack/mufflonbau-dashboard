import { liveCard, view } from '../core/cards.js';
export function homeView({ config, text, language }, otherViews) {
  const shared = { appearance: config.appearance };
  const cards = [liveCard('header', { ...shared, title: config.title ?? 'Mufflonbau', weather: config.weather, calendars: config.calendars, rooms: config.rooms }, language)];
  if (config.rooms.length) cards.push(liveCard('climate', { ...shared, rooms: config.rooms }, language));
  const lights = [...new Set(config.rooms.flatMap(room => room.lights))];
  if (lights.length) cards.push(liveCard('devices', { ...shared, entities: lights, title: text.lights }, language));
  if (config.people.length) cards.push(liveCard('people', { ...shared, people: config.people }, language));
  if (config.cleaning?.entity) cards.push(liveCard('cleaning', { ...shared, cleaning: config.cleaning }, language));
  if (config.monitors.length) cards.push(liveCard('warnings', { ...shared, monitors: config.monitors, compact: true }, language));
  if (config.entities.length) cards.push(liveCard('devices', { ...shared, entities: config.entities, title: text.overview }, language));
  if (!config.rooms.length && !config.people.length && !config.entities.length && !otherViews.length) {
    cards.push(liveCard('message', { ...shared, content: text.empty }, language));
  }
  return view('home', text.home, 'mdi:home', cards);
}

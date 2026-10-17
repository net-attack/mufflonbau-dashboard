import { liveCard, view } from '../core/cards.js';
export function homeView({ config, text, language }, otherViews) {
  const shared = { appearance: config.appearance };
  const cards = [liveCard('header', { ...shared, compact: true, title: config.title ?? 'Mufflonbau', weather: config.weather, calendars: config.calendars, rooms: config.rooms }, language)];
  if (config.rooms.length) cards.push(liveCard('climate', { ...shared, compact: true, rooms: config.rooms }, language));
  if (config.people.length) cards.push(liveCard('people', { ...shared, compact: true, people: config.people }, language));
  if (config.cleaning?.entity) cards.push(liveCard('cleaning', { ...shared, compact: true, cleaning: config.cleaning }, language));
  if (config.monitors.length) cards.push(liveCard('warnings', { ...shared, monitors: config.monitors, compact: true }, language));
  if (config.entities.length) cards.push(liveCard('devices', { ...shared, entities: config.entities, title: text.overview }, language));
  if (!config.rooms.length && !config.people.length && !config.entities.length && !otherViews.some(item => !item.path.startsWith('admin'))) {
    cards.push(liveCard('message', { ...shared, content: text.empty }, language));
  }
  return view('home', text.home, 'mdi:home', cards);
}

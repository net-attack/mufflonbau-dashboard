import { liveCard, view } from '../core/cards.js';
export function homeView({ config, text, language }, otherViews) {
  const shared = { appearance: config.appearance };
  const cards = [liveCard('header', { ...shared, compact: true, title: config.title ?? 'Mufflonbau', weather: config.weather, calendars: config.calendars, rooms: config.rooms }, language)];
  if (config.rooms.length) cards.push(liveCard('room-summary', { ...shared, compact: true, rooms: config.rooms }, language));
  if (config.people.length) cards.push(liveCard('presence-summary', { ...shared, compact: true, people: config.people }, language));
  if (config.cleaning?.entity) cards.push(liveCard('cleaning', { ...shared, compact: true, cleaning: config.cleaning }, language));
  if (config.monitors.length) cards.push(liveCard('warnings', { ...shared, monitors: config.monitors, compact: true }, language));
  if (config.shopping) cards.push({ type: 'custom:mufflonbau-shopping', ...shared, shopping: config.shopping, language });
  if (config.entities.length) cards.push(liveCard('devices', { ...shared, entities: config.entities, title: text.overview }, language));
  if (!config.rooms.length && !config.people.length && !config.entities.length && !otherViews.some(item => !item.path.startsWith('admin'))) {
    cards.push(liveCard('message', { ...shared, content: text.empty }, language));
  }
  return view('home', text.home, 'mdi:home', cards);
}

export function presenceView({ config, text, language }) {
  if (!config.people.length) return [];
  return [view('presence', text.people, 'mdi:account-group-outline', [
    { type: 'custom:mufflonbau-presence', people: config.people, appearance: config.appearance, language },
  ], { subview: true })];
}

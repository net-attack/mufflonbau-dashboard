import { entityList, liveCard, navigation, view } from '../core/cards.js';
export function homeView({ config, text, language, hass }, otherViews) {
  const cards = [{ type: 'markdown', content: text.welcome }];
  const available = config.entities.filter(id => Object.hasOwn(hass.states, id));
  const missing = config.entities.filter(id => !Object.hasOwn(hass.states, id));
  if (available.length) cards.push(...entityList(available, text.overview));
  else if (!config.rooms.length && !config.people.length && !config.weather && !config.calendars.length && !config.cleaning && !config.monitors.length) cards.push({ type: 'markdown', content: text.empty });
  if (missing.length) cards.push({ type: 'markdown', content: `${text.missing}: ${missing.map(id => `\`${id}\``).join(', ')}` });
  if (config.rooms.length || config.people.length || config.weather || config.calendars.length) {
    cards.push(liveCard('header', { title: config.title ?? 'Mufflonbau', weather: config.weather, calendars: config.calendars, appearance: config.appearance }, language));
  }
  cards.push(...entityList(config.people, text.home));
  if (config.weather) cards.push({ type: 'weather-forecast', entity: config.weather, show_forecast: false });
  if (config.calendars.length) cards.push({ type: 'calendar', initial_view: 'listWeek', entities: config.calendars });
  if (config.rooms.length) cards.push(liveCard('climate', { rooms: config.rooms, appearance: config.appearance }, language));
  cards.push(...entityList(config.rooms.flatMap(room => room.lights), text.lights));
  if (config.cleaning?.entity) cards.push(...entityList([config.cleaning.entity], text.cleaning));
  if (config.monitors.length) cards.push(liveCard('warnings', { monitors: config.monitors, appearance: config.appearance }, language));
  if (otherViews.length) cards.push({ type: 'grid', columns: 3, square: false,
    cards: otherViews.filter(item => !item.subview).map(item => navigation(item.path, item.title, item.icon)) });
  return view('home', text.home, 'mdi:home', cards);
}

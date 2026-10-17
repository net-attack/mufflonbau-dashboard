import { normalizeConfig } from './core/config.js';
import { resolveLanguage, translations } from './core/i18n.js';
import { roomViews, climateViews } from './modules/rooms.js';
import { cleaningViews } from './modules/cleaning.js';
import { systemViews } from './modules/system.js';
import { calendarViews } from './modules/calendar.js';
import { homeView, presenceView } from './modules/home.js';
import { roomLightHierarchy } from './core/light-hierarchy.js';
import { cleaningPageText } from './core/cleaning-theme.js';
import { weatherPopups } from './core/weather-alerts.js';
export function generateDashboard(rawConfig, hass) {
  const config = normalizeConfig(rawConfig);
  config.rooms = config.rooms.map(room => {
    const { lights, members } = roomLightHierarchy(room, hass.states);
    return { ...room, lights, member_lights: members };
  });
  const language = resolveLanguage(config, hass);
  const context = { config, hass, language, text: translations[language] };
  const views = [...roomViews(context), ...presenceView(context), ...climateViews(context), ...cleaningViews(context), ...calendarViews(context), ...systemViews(context)];
  const allViews = [homeView(context, views), ...views];
  const firstLinks = ['home', 'calendar', 'rooms', 'cleaning'];
  const navigation = allViews.filter(item => !item.subview || item.path === 'presence').map(({ path, title, icon }) => ({ path, title, icon }))
    .sort((a, b) => {
      const rank = path => firstLinks.includes(path) ? firstLinks.indexOf(path) : firstLinks.length;
      return rank(a.path) - rank(b.path);
    });
  const styledViews = allViews.map(item => ({ ...item, type: 'panel', cards: [{
    type: 'custom:mufflonbau-shell', title: config.title || 'Mufflonbau', language, appearance: config.appearance,
    path: item.path, view_title: item.path === 'cleaning' && config.cleaning?.theme === 'flusenfels' ? cleaningPageText(config.cleaning, language).title : item.title,
    cleaning_theme: item.path === 'cleaning' ? config.cleaning?.theme : undefined,
    full_view: item.fullView, navigation, weather_alerts: config.weather_alerts, cards: [...item.cards,
      ...weatherPopups(config.weather_alerts, language, config.appearance),
      ...(config.weather_alerts && item.path !== 'home' ? [{ type: 'custom:mufflonbau-weather-alerts', mode: 'observer', weather_alerts: config.weather_alerts, language, appearance: config.appearance }] : []),
    ],
  }] }));
  return { ...(config.kiosk_mode ? { kiosk_mode: config.kiosk_mode } : {}), title: config.title || 'Mufflonbau', views: styledViews };
}

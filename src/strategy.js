import { normalizeConfig } from './core/config.js';
import { resolveLanguage, translations } from './core/i18n.js';
import { roomViews, climateViews } from './modules/rooms.js';
import { cleaningViews } from './modules/cleaning.js';
import { systemViews } from './modules/system.js';
import { calendarViews } from './modules/calendar.js';
import { homeView } from './modules/home.js';
import { roomLightHierarchy } from './core/light-hierarchy.js';
export function generateDashboard(rawConfig, hass) {
  const config = normalizeConfig(rawConfig);
  config.rooms = config.rooms.map(room => {
    const { lights, members } = roomLightHierarchy(room, hass.states);
    return { ...room, lights, member_lights: members };
  });
  const language = resolveLanguage(config, hass);
  const context = { config, hass, language, text: translations[language] };
  const views = [...roomViews(context), ...climateViews(context), ...cleaningViews(context), ...calendarViews(context), ...systemViews(context)];
  const allViews = [homeView(context, views), ...views];
  const navigation = allViews.filter(item => !item.subview).map(({ path, title, icon }) => ({ path, title, icon }));
  const styledViews = allViews.map(item => ({ ...item, type: 'panel', cards: [{
    type: 'custom:mufflonbau-shell', title: config.title || 'Mufflonbau', language, appearance: config.appearance,
    path: item.path, view_title: item.title, full_view: item.fullView, navigation, cards: item.cards,
  }] }));
  return { ...(config.kiosk_mode ? { kiosk_mode: config.kiosk_mode } : {}), title: config.title || 'Mufflonbau', views: styledViews };
}

import { normalizeConfig } from './core/config.js';
import { resolveLanguage, translations } from './core/i18n.js';
import { roomViews, climateViews } from './modules/rooms.js';
import { cleaningViews } from './modules/cleaning.js';
import { systemViews } from './modules/system.js';
import { homeView } from './modules/home.js';
export function generateDashboard(rawConfig, hass) {
  const config = normalizeConfig(rawConfig);
  const language = resolveLanguage(config, hass);
  const context = { config, hass, language, text: translations[language] };
  const views = [...roomViews(context), ...climateViews(context), ...cleaningViews(context), ...systemViews(context)];
  return { ...(config.kiosk_mode ? { kiosk_mode: config.kiosk_mode } : {}), title: config.title || 'Mufflonbau', views: [homeView(context, views), ...views] };
}

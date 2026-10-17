export const translations = {
  en: {
    welcome: '# Welcome to Mufflonbau\n\nYour extensible Home Assistant dashboard.',
    overview: 'Overview', empty: 'No available entities selected yet. Add `entities` to the dashboard strategy.',
    missing: 'Not found', home: 'Home', rooms: 'Rooms', climate: 'Climate', cleaning: 'Cleaning',
    system: 'System check', expert: 'Expert', calendar: 'Calendar', lights: 'Lights',
    temperature: 'Temperature', humidity: 'Humidity', history: 'History',
    offline: 'Offline', battery: 'Battery', healthy: 'All monitored devices are healthy.',
    vacuum: 'Vacuum', mop: 'Mop', room: 'Room', dewPoint: 'Dew point',
  },
  de: {
    welcome: '# Willkommen im Mufflonbau\n\nDein erweiterbares Home-Assistant-Dashboard.',
    overview: 'Übersicht', empty: 'Noch keine verfügbaren Entitäten ausgewählt. Ergänze `entities` in der Dashboard-Strategie.',
    missing: 'Nicht gefunden', home: 'Zuhause', rooms: 'Räume', climate: 'Klima', cleaning: 'Reinigung',
    system: 'Systemprüfung', expert: 'Experte', calendar: 'Kalender', lights: 'Licht',
    temperature: 'Temperatur', humidity: 'Luftfeuchtigkeit', history: 'Verlauf',
    offline: 'Offline', battery: 'Batterie', healthy: 'Alle überwachten Geräte sind in Ordnung.',
    vacuum: 'Saugen', mop: 'Wischen', room: 'Raum', dewPoint: 'Taupunkt',
  },
};

export function resolveLanguage(config, hass) {
  const language = config.language ?? 'auto';
  if (!['auto', 'de', 'en'].includes(language)) {
    throw new Error('Mufflonbau: language must be "auto", "de", or "en".');
  }
  if (language !== 'auto') return language;
  const profile = hass.locale?.language ?? hass.language ?? 'en';
  return profile.toLowerCase().split(/[-_]/)[0] === 'de' ? 'de' : 'en';
}

export function localized(value, language) {
  return typeof value === 'string' ? value : value?.[language] ?? value?.en ?? '';
}

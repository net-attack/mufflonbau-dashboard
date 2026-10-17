export const translations = {
  en: {
    welcome: '# Welcome to Mufflonbau\n\nYour extensible Home Assistant dashboard.',
    overview: 'Overview', empty: 'No available entities selected yet. Add `entities` to the dashboard strategy.',
    missing: 'Not found', home: 'Home', rooms: 'Rooms', climate: 'Climate', cleaning: 'Cleaning',
    system: 'System check', expert: 'Expert', calendar: 'Calendar', lights: 'Lights',
    temperature: 'Temperature', humidity: 'Humidity', history: 'History',
    offline: 'Offline', battery: 'Battery', healthy: 'All monitored devices are healthy.',
    systemShort: 'System', more: 'More', navigation: 'Navigation', live: 'Connected to your home', yourSpace: 'A little space. All yours.',
    morning: 'Good morning.', afternoon: 'Good afternoon.', evening: 'Good evening.', people: 'Who’s home',
    allDetails: 'View details', floorplan: 'Floorplan', noEvents: 'No upcoming events', actionFailed: 'Action failed. Please try again.',
    cardLoadError: 'Card could not be loaded. Reload the dashboard.',
    states: { on: 'On', off: 'Off', home: 'Home', not_home: 'Away', docked: 'At the dock', cleaning: 'Cleaning', returning: 'Returning home', paused: 'Paused', idle: 'Ready' },
    vacuum: 'Vacuum', mop: 'Mop', room: 'Room', dewPoint: 'Dew point',
  },
  de: {
    welcome: '# Willkommen im Mufflonbau\n\nDein erweiterbares Home-Assistant-Dashboard.',
    overview: 'Übersicht', empty: 'Noch keine verfügbaren Entitäten ausgewählt. Ergänze `entities` in der Dashboard-Strategie.',
    missing: 'Nicht gefunden', home: 'Zuhause', rooms: 'Räume', climate: 'Klima', cleaning: 'Reinigung',
    system: 'Systemprüfung', expert: 'Experte', calendar: 'Kalender', lights: 'Licht',
    temperature: 'Temperatur', humidity: 'Luftfeuchtigkeit', history: 'Verlauf',
    offline: 'Offline', battery: 'Batterie', healthy: 'Alle überwachten Geräte sind in Ordnung.',
    systemShort: 'System', more: 'Mehr', navigation: 'Navigation', live: 'Mit deinem Zuhause verbunden', yourSpace: 'Dein Zuhause. Dein Rückzugsort.',
    morning: 'Guten Morgen.', afternoon: 'Guten Tag.', evening: 'Guten Abend.', people: 'Wer ist zuhause',
    allDetails: 'Details ansehen', floorplan: 'Grundriss', noEvents: 'Keine anstehenden Termine', actionFailed: 'Aktion fehlgeschlagen. Bitte erneut versuchen.',
    cardLoadError: 'Karte konnte nicht geladen werden. Bitte Dashboard neu laden.',
    states: { on: 'An', off: 'Aus', home: 'Zuhause', not_home: 'Unterwegs', docked: 'An der Station', cleaning: 'Reinigung läuft', returning: 'Fährt zur Station', paused: 'Pausiert', idle: 'Bereit' },
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

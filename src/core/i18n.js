export const translations = {
  en: {
    admin: 'Admin · nerd panel',
    internet: 'Internet',
    network: 'Network',
    host: 'Home Assistant · Raspberry Pi',
    clients: 'Network devices', connected: 'Present', away: 'Away', technicalDetails: 'Technical details', measured: 'Last updated',
    adminIntro: 'Technical details live here. Your home overview stays focused on daily life.',
    internetSetup: 'Select your router connection, download, upload and latency entities under admin.internet. A connected dashboard does not prove internet access.',
    networkSetup: 'Select router and Wi-Fi sensors under admin.network and router-backed device trackers under admin.clients. Presence alone does not distinguish Wi-Fi from Ethernet.',
    hostSetup: 'Add the System monitor integration, enable CPU temperature, processor, memory and disk sensors, then select them under admin.host.',
    clientNote: 'Presence is reported by the selected integration; it may be delayed. Open a device for its reported connection details.',
    setup: 'Set up data sources',
    historyLoading: 'Loading history…',
    historyError: 'History could not be loaded. Check Recorder and permissions.',
    retry: 'Retry',
    welcome: '# Welcome to Mufflonbau\n\nYour extensible Home Assistant dashboard.',
    overview: 'Overview', empty: 'No available entities selected yet. Add `entities` to the dashboard strategy.',
    home: 'Home', rooms: 'Rooms', climate: 'Climate', cleaning: 'Cleaning',
    system: 'System check', expert: 'Expert', calendar: 'Calendar', lights: 'Lights',
    indoorClimate: 'Indoor climate', wind: 'Wind', temperature: 'Temperature', humidity: 'Humidity', history: 'History',
    missing: 'Entity not found', unknown: 'State unknown', unavailable: 'Unavailable in Home Assistant', invalidValue: 'Invalid sensor value', noReadings: 'No readings available',
    battery: 'Battery', healthy: 'All monitored devices are healthy.',
    systemShort: 'System', more: 'More', navigation: 'Navigation', live: 'Connected to your home', yourSpace: 'A little space. All yours.',
    morning: 'Good morning.', afternoon: 'Good afternoon.', evening: 'Good evening.', people: 'Who’s home',
    allDetails: 'View details', floorplan: 'Floorplan', noEvents: 'No upcoming events', actionFailed: 'Action failed. Please try again.',
    cardLoadError: 'Card could not be loaded. Reload the dashboard.',
    states: { on: 'On', off: 'Off', home: 'Home', not_home: 'Away', docked: 'At the dock', cleaning: 'Cleaning', returning: 'Returning home', paused: 'Paused', idle: 'Ready' },
    vacuum: 'Vacuum', mop: 'Mop', room: 'Room', dewPoint: 'Dew point',
  },
  de: {
    admin: 'Admin · Nerd-Panel',
    internet: 'Internet',
    network: 'Netzwerk',
    host: 'Home Assistant · Raspberry Pi',
    clients: 'Netzwerkgeräte', connected: 'Anwesend', away: 'Abwesend', technicalDetails: 'Technische Details', measured: 'Zuletzt aktualisiert',
    adminIntro: 'Hier wohnen die technischen Details. Die Startseite bleibt auf den Alltag konzentriert.',
    internetSetup: 'Router-Verbindung, Download, Upload und Latenz unter admin.internet auswählen. Eine Dashboard-Verbindung belegt keinen Internetzugang.',
    networkSetup: 'Router- und WLAN-Sensoren unter admin.network und Router-Gerätetracker unter admin.clients auswählen. Anwesenheit allein unterscheidet WLAN und LAN nicht.',
    hostSetup: 'Integration System monitor hinzufügen, CPU-Temperatur, Prozessor-, RAM- und Speichersensoren aktivieren und unter admin.host auswählen.',
    clientNote: 'Die ausgewählte Integration meldet die Anwesenheit möglicherweise verzögert. Gerät öffnen, um dessen gemeldete Verbindungsdetails zu sehen.',
    setup: 'Datenquellen einrichten',
    historyLoading: 'Verlauf wird geladen…',
    historyError: 'Verlauf konnte nicht geladen werden. Recorder und Berechtigungen prüfen.',
    retry: 'Erneut versuchen',
    welcome: '# Willkommen im Mufflonbau\n\nDein erweiterbares Home-Assistant-Dashboard.',
    overview: 'Übersicht', empty: 'Noch keine verfügbaren Entitäten ausgewählt. Ergänze `entities` in der Dashboard-Strategie.',
    home: 'Zuhause', rooms: 'Räume', climate: 'Klima', cleaning: 'Reinigung',
    system: 'Systemprüfung', expert: 'Experte', calendar: 'Kalender', lights: 'Licht',
    indoorClimate: 'Raumklima', wind: 'Wind', temperature: 'Temperatur', humidity: 'Luftfeuchtigkeit', history: 'Verlauf',
    missing: 'Entity nicht gefunden', unknown: 'Zustand unbekannt', unavailable: 'In Home Assistant nicht verfügbar', invalidValue: 'Ungültiger Sensorwert', noReadings: 'Keine Messwerte vorhanden',
    battery: 'Batterie', healthy: 'Alle überwachten Geräte sind in Ordnung.',
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

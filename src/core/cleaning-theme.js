import { translations } from './i18n.js';

const court = {
  de: {
    title: 'Saugfrieds Hof', subtitle: 'Fürst von Flusenfels', motto: 'Im Dienste blanker Böden.',
    dispatch: 'Kundgabe aus dem Fürstentum', map: 'Die Karte des Reiches',
    resting: 'Der Fürst sammelt Kräfte. Die Flusen mögen zittern.',
    marching: 'Höret, höret! Den Flusen wird der Kampf erklärt.',
    homeward: 'Der Fürst kehrt heim. Die Burg ruft!',
    paused: 'Waffenruhe im Flusenreich. Ein Päuschen sei ihm gegönnt.',
    waiting: 'Der Fürst harrt Eures Befehls.', offline: 'Kein Lebenszeichen vom Hof. Verbindung prüfen.',
    trouble: 'Ein Unheil hält den Fürsten auf. Meldung des Roboters prüfen.',
    cleaningMode: 'Wählet Euren Feldzug', chooseCleaningRoom: 'Wählet ein Gemach. Der gewählte Feldzug beginnt sogleich.',
    vacuum: 'Flusenjagd · Saugen', mop: 'Schrubbdienst · Wischen', cleanGenius: 'Hofmagie · CleanGenius',
    startPause: 'Aufbruch / Waffenruhe', stop: 'Halt geboten · Stopp', returnHome: 'Heim zur Burg · Station',
    battery: 'Kraftreserven', room: 'Gemach', currentCleaning: 'Der laufende Feldzug',
    actionFailed: 'Der Befehl ward nicht ausgeführt. Bitte erneut versuchen.',
    states: { docked: 'Rastet in der Burg', cleaning: 'Auf Flusenfeldzug', returning: 'Heimkehr zur Burg', paused: 'Hält Waffenruhe', idle: 'Bereit zum Feldzug', error: 'Der Feldzug stockt · Fehler' },
  },
  en: {
    title: 'Saugfried’s court', subtitle: 'Prince of Flusenfels', motto: 'In service of spotless floors.',
    dispatch: 'A proclamation from the realm', map: 'The map of the realm',
    resting: 'His Highness gathers strength. Let the dust tremble.',
    marching: 'Hear ye, hear ye! The dust crusade is underway.',
    homeward: 'His Highness rides home. The castle calls!',
    paused: 'A truce in the dust realm. A little rest is deserved.',
    waiting: 'His Highness awaits thy command.', offline: 'No word from the court. Check the connection.',
    trouble: 'Misfortune holds His Highness back. Check the robot’s error report.',
    cleaningMode: 'Choose thy campaign', chooseCleaningRoom: 'Choose a chamber. The selected campaign begins at once.',
    vacuum: 'Dust crusade · Vacuum', mop: 'Royal scrubbing · Mop', cleanGenius: 'Court magic · CleanGenius',
    startPause: 'March / Truce', stop: 'Halt · Stop', returnHome: 'To the castle · Dock',
    battery: 'Strength reserves', room: 'Chamber', currentCleaning: 'The current campaign',
    actionFailed: 'Thy command could not be carried out. Please try again.',
    states: { docked: 'Resting at the castle', cleaning: 'On a dust crusade', returning: 'Returning to the castle', paused: 'Observing a truce', idle: 'Ready for a campaign', error: 'The campaign is troubled · Error' },
  },
};

export function cleaningPageText(cleaning, language) {
  const base = translations[language];
  if (cleaning?.theme !== 'flusenfels') return base;
  const copy = court[language];
  return { ...base, ...copy, states: { ...base.states, ...copy.states } };
}

export function saugfriedMood(state) {
  if (!state || ['unknown', 'unavailable'].includes(state.state)) return { art: 'puzzled', message: 'offline' };
  if (state.state === 'error') return { art: 'puzzled', message: 'trouble' };
  if (state.state === 'cleaning') return { art: 'campaign', message: 'marching' };
  if (state.state === 'returning') return { art: 'riding', message: 'homeward' };
  if (state.state === 'docked') return { art: 'resting', message: 'resting' };
  if (state.state === 'paused') return { art: 'resting', message: 'paused' };
  return { art: 'greeting', message: 'waiting' };
}

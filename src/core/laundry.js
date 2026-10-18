import { localized } from './i18n.js';
import { numericState } from './state.js';

export const laundryText = {
  de: { title: 'Wäschekammer', idle: 'Bereit', starting: 'Start wird erkannt', running: 'Läuft', finishing: 'Programmende wird geprüft', finished: 'Fertig · Wäsche wartet', pending: 'Fertigmeldung offen', confirm: 'Diese Fertigmeldung bleibt bis zu deiner Bestätigung sichtbar. Schließen bestätigt sie nicht.', missing: 'Erkennung noch nicht eingerichtet', unavailable: 'Messung nicht verfügbar', unknown: 'Status unbekannt', power: 'Leistung', last: 'Zuletzt fertig', acknowledge: 'Wäsche erledigt', close: 'Schließen', error: 'Bestätigung fehlgeschlagen', inferred: 'Programmstatus aus dem Stromverbrauch geschätzt. Keine Restzeit verfügbar.' },
  en: { title: 'Laundry room', idle: 'Ready', starting: 'Detecting start', running: 'Running', finishing: 'Checking programme end', finished: 'Finished · laundry waiting', pending: 'Completion awaiting confirmation', confirm: 'This completion stays visible until you confirm it. Closing does not acknowledge it.', missing: 'Detection not set up yet', unavailable: 'Reading unavailable', unknown: 'Unknown status', power: 'Power', last: 'Last finished', acknowledge: 'Laundry collected', close: 'Close', error: 'Acknowledgement failed', inferred: 'Programme status estimated from power consumption. Remaining time unavailable.' },
};

export function laundryEntities(items = []) {
  return items.flatMap(item => [item.power, item.status, item.last_finished, item.acknowledged, item.plug]).filter(Boolean);
}

// HA supplies the epoch timestamp for date/time helpers. Parsing their local
// state string in the browser would use the browser's timezone instead of HA's.
export function laundryTimestamp(state) {
  if (!state || ['unknown', 'unavailable'].includes(state.state)) return null;
  const timestamp = state.attributes?.timestamp;
  return Number.isFinite(timestamp) && timestamp > 946684800 ? Math.floor(timestamp) : null;
}

export function laundryStatus(item, states, language = 'en') {
  const text = laundryText[language];
  const phase = states[item.status]?.state;
  const reading = numericState(states[item.power]);
  const power = reading !== null && reading >= 0 && states[item.power]?.attributes?.unit_of_measurement === 'W' ? reading : null;
  let status = ['idle', 'starting', 'running', 'finishing', 'finished'].includes(phase) ? phase : 'unknown';
  if (phase === 'starting_after_finished') status = 'finished';
  // A latched completion remains useful when the appliance/plug goes offline.
  if (!['finished', 'starting_after_finished'].includes(phase)) {
    if (!states[item.status]) status = 'missing';
    else if (power === null || item.plug && states[item.plug]?.state !== 'on') status = 'unavailable';
  }
  const finished = laundryTimestamp(states[item.last_finished]);
  const acknowledged = laundryTimestamp(states[item.acknowledged]);
  const pending = item.acknowledged
    ? finished !== null ? acknowledged === null || finished > acknowledged : status === 'finished'
    : status === 'finished';
  if (pending && ['idle', 'starting'].includes(status)) status = 'finished';
  if (!pending && status === 'finished') status = power === null || item.plug && states[item.plug]?.state !== 'on' ? 'unavailable' : phase === 'starting_after_finished' ? 'starting' : 'idle';
  return { name: localized(item.name, language), status, label: text[status], power, pending, finished };
}

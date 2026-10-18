import { availability, numericState } from './state.js';

export function normalizeVentilation(value, rooms, entity) {
  const fail = (key, message) => { throw new Error(`Mufflonbau: ventilation${key ? `.${key}` : ''} ${message}`); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('', 'must be an object.');
  if (value.outdoor_sources !== undefined) {
    if (value.outdoor_temperature !== undefined || value.outdoor_humidity !== undefined) fail('outdoor_sources', 'cannot be combined with outdoor_temperature/outdoor_humidity.');
    if (!Array.isArray(value.outdoor_sources) || !value.outdoor_sources.length) fail('outdoor_sources', 'must be a non-empty array of temperature/humidity pairs in priority order.');
  }
  const used = new Set();
  for (const [index, source] of outdoorSources(value).entries()) {
    const key = value.outdoor_sources ? `outdoor_sources[${index}]` : '';
    if (!source || typeof source !== 'object' || Array.isArray(source)) fail(key, 'must be a temperature/humidity pair.');
    if (source.name !== undefined && (typeof source.name !== 'string' || !source.name.trim())) fail(`${key}.name`, 'must be a non-empty string.');
    for (const kind of ['temperature', 'humidity']) {
      entity(source[kind], `ventilation.${key ? `${key}.${kind}` : `outdoor_${kind}`}`);
      if (used.has(source[kind])) fail(key, 'must use separate, unique sensor entities.');
      used.add(source[kind]);
    }
  }
  const result = { max_age_minutes: 180, humidity_high: 60, min_drying_difference: 1, ...value };
  for (const [key, min, max] of [['max_age_minutes', 5, 1440], ['humidity_high', 40, 80], ['min_drying_difference', 0.2, 5]]) {
    if (!Number.isFinite(result[key]) || result[key] < min || result[key] > max) fail(key, `must be a number between ${min} and ${max}.`);
  }
  if (result.room_ids !== undefined) {
    if (!Array.isArray(result.room_ids) || !result.room_ids.length || new Set(result.room_ids).size !== result.room_ids.length) fail('room_ids', 'must be a non-empty array of unique room IDs.');
    for (const id of result.room_ids) if (!rooms.some(room => room.id === id && room.temperature && room.humidity)) fail('room_ids', 'must reference rooms with configured temperature and humidity.');
  }
  if (!ventilationRooms(rooms, result).some(room => room.temperature && room.humidity)) fail('', 'requires at least one room with temperature and humidity.');
  return result;
}
export function ventilationEntities(config) {
  return config ? outdoorSources(config).flatMap(source => [source.temperature, source.humidity]) : [];
}
function outdoorSources(config) {
  return config.outdoor_sources ?? [{ temperature: config.outdoor_temperature, humidity: config.outdoor_humidity }];
}
export function ventilationRooms(rooms, config) {
  return rooms.filter(room => config.room_ids ? config.room_ids.includes(room.id) : room.temperature || room.humidity);
}

// Bolton (1980), equation 10; water-vapour ideal gas law. See docs/VENTILATION.de.md.
export function moisture(temperature, humidity) {
  const vaporPressure = 6.112 * Math.exp(17.67 * temperature / (temperature + 243.5)) * humidity / 100;
  const gamma = Math.log(vaporPressure / 6.112);
  return { temperature, humidity, vaporPressure,
    absolute: 216.74 * vaporPressure / (temperature + 273.15),
    dewPoint: humidity === 0 ? null : 243.5 * gamma / (17.67 - gamma) };
}
function reading(id, states, kind, now, maxAge) {
  const state = states[id];
  const status = availability(state);
  if (status !== 'available') return { entity: id, problem: id ? status : 'notConfigured' };
  let value = numericState(state);
  if (value === null) return { entity: id, problem: 'invalidValue' };
  const unit = state.attributes?.unit_of_measurement;
  if (kind === 'temperature') {
    if (unit === '°F') value = (value - 32) * 5 / 9;
    else if (unit === 'K') value -= 273.15;
    else if (unit !== '°C') return { entity: id, problem: 'ventilationUnit' };
    if (value < -40 || value > 60) return { entity: id, problem: 'invalidValue' };
  } else if (unit !== '%') return { entity: id, problem: 'ventilationUnit' };
  else if (value < 0 || value > 100) return { entity: id, problem: 'invalidValue' };
  const timestamp = Date.parse(state.last_reported ?? state.last_updated);
  if (!Number.isFinite(timestamp) || timestamp > now + 300000) return { entity: id, problem: 'ventilationAgeUnknown' };
  if (now - timestamp > maxAge * 60000) return { entity: id, problem: 'ventilationStale' };
  return { entity: id, value, timestamp };
}
function pair(temperature, humidity, states, now, maxAge) {
  const readings = [reading(temperature, states, 'temperature', now, maxAge), reading(humidity, states, 'humidity', now, maxAge)];
  const issues = readings.filter(item => item.problem);
  return issues.length ? { issues } : { ...moisture(readings[0].value, readings[1].value), readings, issues };
}
function windowContacts(room, states) {
  return (room.windows ?? []).map(entity => {
    const state = states[entity];
    const health = availability(state);
    const status = health !== 'available' ? health : state.state === 'on' ? 'open' : state.state === 'off' ? 'closed' : 'invalidValue';
    return { entity, status };
  });
}
export function ventilationStatus(config, rooms, states, now = Date.now()) {
  const settings = { max_age_minutes: 180, humidity_high: 60, min_drying_difference: 1, ...config };
  const sources = outdoorSources(settings).map(source => ({ source, ...pair(source.temperature, source.humidity, states, now, settings.max_age_minutes) }));
  // Use one complete, healthy pair. Never mix temperature and humidity across devices.
  const selected = sources.find(source => !source.issues.length);
  const outdoor = selected ? { ...selected, sources, fallback: selected !== sources[0] } : { issues: sources.flatMap(source => source.issues), sources, fallback: false };
  const results = ventilationRooms(rooms, settings).map(room => {
    // Contacts report changes, so a long-unchanged state is valid. The climate
    // freshness limit must not turn a closed window into a missing reading.
    const windows = windowContacts(room, states);
    const indoor = pair(room.temperature, room.humidity, states, now, settings.max_age_minutes);
    const issues = [...outdoor.issues, ...indoor.issues];
    if (issues.length) return { room, indoor, issues, windows, status: 'unknown', comfort: null };
    // Compare at the SAME indoor temperature: cold air expands when warmed.
    // Vapour pressure / dew point determine drying potential at similar ambient pressure.
    const outdoorAtIndoor = 216.74 * outdoor.vaporPressure / (indoor.temperature + 273.15);
    const difference = indoor.absolute - outdoorAtIndoor;
    const drying = difference >= settings.min_drying_difference;
    const wetter = difference <= -settings.min_drying_difference;
    const humid = indoor.humidity >= settings.humidity_high;
    const status = humid && drying ? 'dry' : wetter ? 'wetter' : humid ? 'wait' : indoor.humidity < 40 ? 'dryIndoor' : 'comfortable';
    const comfort = outdoor.temperature >= indoor.temperature + 2 ? 'warmer' :
      outdoor.temperature < 10 ? 'cold' : indoor.temperature >= 24 && outdoor.temperature <= indoor.temperature - 2 ? 'cooling' : 'neutral';
    return { room, indoor, issues, windows, status, comfort, difference, outdoorAtIndoor };
  });
  return { outdoor, rooms: results, ready: results.filter(item => item.status === 'dry').length,
    unknown: results.filter(item => item.status === 'unknown').length,
    openWindows: results.flatMap(item => item.windows).filter(item => item.status === 'open').length,
    unknownWindows: results.flatMap(item => item.windows).filter(item => !['open', 'closed'].includes(item.status)).length };
}

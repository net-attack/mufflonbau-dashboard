import test from 'node:test';
import assert from 'node:assert/strict';
import { moisture, ventilationStatus } from '../src/core/ventilation.js';
import { collectEntities, normalizeConfig } from '../src/core/config.js';
import { generateDashboard } from '../src/strategy.js';

const now = Date.parse('2026-10-17T12:00:00Z');
const state = (value, unit, timestamp = now) => ({ state: String(value), attributes: { unit_of_measurement: unit }, last_updated: new Date(timestamp).toISOString() });
const settings = { outdoor_temperature: 'sensor.outdoor_temperature', outdoor_humidity: 'sensor.outdoor_humidity' };
const room = { id: 'living', name: 'Living room', temperature: 'sensor.indoor_temperature', humidity: 'sensor.indoor_humidity' };
const readings = (insideT = 21, insideH = 65, outsideT = 8, outsideH = 80) => ({
  'sensor.indoor_temperature': state(insideT, '°C'), 'sensor.indoor_humidity': state(insideH, '%'),
  'sensor.outdoor_temperature': state(outsideT, '°C'), 'sensor.outdoor_humidity': state(outsideH, '%'),
});
const model = (states = readings(), config = settings, rooms = [room], time = now) => ventilationStatus(config, rooms, states, time);
const redundant = { outdoor_sources: [
  { name: 'West', temperature: settings.outdoor_temperature, humidity: settings.outdoor_humidity },
  { name: 'East', temperature: 'sensor.east_temperature', humidity: 'sensor.east_humidity' },
] };
const redundantReadings = () => ({ ...readings(), 'sensor.east_temperature': state(12, '°C'), 'sensor.east_humidity': state(70, '%') });

test('uses preferred complete outdoor pair, falls back for invalid or stale readings and returns after recovery', () => {
  const states = redundantReadings();
  const first = model(states, redundant);
  assert.equal(first.outdoor.source.name, 'West');
  assert.equal(first.outdoor.temperature, 8);
  assert.equal(first.outdoor.fallback, false);
  const failures = [undefined, state('unavailable', '°C'), state('unknown', '°C'), state('NaN', '°C'), state(80, '°C'), state(8, 'bad'), state(8, '°C', now - 4 * 3600000), { state: '8', attributes: { unit_of_measurement: '°C' } }];
  for (const failed of failures) {
    const result = model({ ...states, [settings.outdoor_temperature]: failed }, redundant);
    assert.equal(result.outdoor.source.name, 'East');
    assert.equal(result.outdoor.fallback, true);
    assert.equal(result.outdoor.temperature, 12);
    assert.equal(result.outdoor.humidity, 70, 'Must use backup humidity even if preferred humidity is healthy');
    assert.equal(result.outdoor.issues.length, 0, 'Failed inactive pair must not block healthy readings');
    assert.equal(result.rooms[0].status, 'dry');
  }
  states[settings.outdoor_humidity] = state('unavailable', '%');
  assert.equal(model(states, redundant).outdoor.source.name, 'East');
  states[settings.outdoor_humidity] = state(80, '%');
  assert.equal(model(states, redundant).outdoor.source.name, 'West', 'Preferred source resumes on recovery');
  states['sensor.east_humidity'] = state('unavailable', '%');
  assert.equal(model(states, redundant).outdoor.source.name, 'West', 'Backup failure must not affect preferred source');
});

test('never combines partial outdoor pairs or recommends ventilation when all sources fail', () => {
  const states = redundantReadings();
  states[settings.outdoor_humidity] = state('unavailable', '%');
  states['sensor.east_temperature'] = state('unavailable', '°C');
  const result = model(states, redundant);
  assert.equal(result.outdoor.source, undefined);
  assert.equal(result.outdoor.issues.length, 2);
  assert.equal(result.ready, 0);
  assert.equal(result.rooms[0].status, 'unknown');
});

test('explicit redundant configuration tracks every source and rejects ambiguous or shared sources', () => {
  const config = normalizeConfig({ rooms: [room], ventilation: redundant });
  for (const source of redundant.outdoor_sources) for (const kind of ['temperature', 'humidity']) assert.ok(collectEntities(config).includes(source[kind]));
  for (const value of [
    { ...redundant, ...settings }, { outdoor_sources: [] }, { outdoor_sources: null },
    { outdoor_sources: [null] }, { outdoor_sources: [{}] },
    { outdoor_sources: [redundant.outdoor_sources[0], redundant.outdoor_sources[0]] },
    { outdoor_sources: [{ ...redundant.outdoor_sources[0], name: '' }] },
  ]) assert.throws(() => normalizeConfig({ rooms: [room], ventilation: value }), /ventilation/);
});

test('moisture calculations match known psychrometric values and preserve zero humidity', () => {
  const values = moisture(20, 50);
  assert.ok(Math.abs(values.absolute - 8.64) < .03);
  assert.ok(Math.abs(values.dewPoint - 9.27) < .03);
  assert.ok(Math.abs(moisture(0, 100).absolute - 4.85) < .01);
  assert.ok(Math.abs(moisture(10, 100).dewPoint - 10) < 1e-10);
  assert.equal(moisture(20, 0).absolute, 0);
  assert.equal(moisture(20, 0).dewPoint, null);
});
test('compares moisture rather than relative humidity and keeps temperature comfort separate', () => {
  const dry = model().rooms[0];
  assert.equal(dry.status, 'dry', 'Cold 80% outdoor air dries a 65% room');
  assert.equal(dry.comfort, 'cold');
  const humidSummer = model(readings(21, 65, 30, 50)).rooms[0];
  assert.equal(humidSummer.status, 'wetter', 'Warmer 50% outdoor air can contain MORE moisture');
  assert.equal(humidSummer.comfort, 'warmer');
  const comfortable = model(readings(26, 50, 18, 50)).rooms[0];
  assert.equal(comfortable.status, 'comfortable', 'Cooling potential alone must not become a drying request');
  assert.equal(comfortable.comfort, 'cooling');
  assert.equal(model(readings(20, 30, 0, 20)).rooms[0].status, 'dryIndoor');
  assert.equal(model(readings(21, 65, 21, 65)).rooms[0].status, 'wait');
});
test('uses common indoor temperature for drying difference instead of comparing unlike air volumes', () => {
  const result = model(readings(35, 11, 0, 100)).rooms[0];
  const outside = moisture(0, 100);
  assert.ok(result.indoor.absolute < outside.absolute, 'Raw density has the opposite sign in this example');
  assert.ok(result.difference > 0, 'Outdoor air is slightly drier after warming to indoor temperature');
  assert.ok(result.indoor.dewPoint > outside.dewPoint);
  assert.equal(result.status, 'dryIndoor');
});
test('supports explicit Celsius, Fahrenheit, Kelvin and percent units', () => {
  const states = readings();
  states[room.temperature] = state(69.8, '°F');
  states[settings.outdoor_temperature] = state(281.15, 'K');
  const result = model(states).rooms[0];
  assert.equal(result.status, 'dry');
  assert.ok(Math.abs(result.indoor.temperature - 21) < 1e-10);
  for (const unit of [undefined, 'C', 'g/m³']) {
    const bad = readings(); bad[room.temperature].attributes.unit_of_measurement = unit;
    assert.equal(model(bad).rooms[0].issues[0].problem, 'ventilationUnit');
  }
});
test('missing, unknown, unavailable, invalid, out-of-range and stale values never recommend ventilation', () => {
  for (const [value, reason] of [[null, 'missing'], ['unknown', 'unknown'], ['unavailable', 'unavailable'], ['', 'invalidValue'], ['NaN', 'invalidValue'], [101, 'invalidValue'], [-1, 'invalidValue']]) {
    const states = readings();
    states[settings.outdoor_humidity] = value === null ? undefined : state(value, '%');
    const result = model(states);
    assert.equal(result.ready, 0); assert.equal(result.rooms[0].status, 'unknown');
    assert.equal(result.outdoor.issues[0].problem, reason);
  }
  const states = readings();
  assert.equal(model(states, settings, [room], now + 180 * 60000).rooms[0].status, 'dry');
  assert.equal(model(states, settings, [room], now + 180 * 60000 + 1).rooms[0].status, 'unknown');
  delete states[settings.outdoor_temperature].last_updated;
  assert.equal(model(states).outdoor.issues[0].problem, 'ventilationAgeUnknown');
  states[settings.outdoor_temperature].last_updated = new Date(now + 3600000).toISOString();
  assert.equal(model(states).outdoor.issues[0].problem, 'ventilationAgeUnknown');
});
test('uses last_reported if HA supplies it and never substitutes another outdoor sensor', () => {
  const states = readings();
  states[settings.outdoor_temperature] = { ...state(8, '°C', now - 86400000), last_reported: new Date(now).toISOString() };
  assert.equal(model(states).rooms[0].status, 'dry');
  states[settings.outdoor_temperature].state = 'unavailable';
  states['sensor.other_temperature'] = state(8, '°C');
  assert.equal(model(states).rooms[0].status, 'unknown');
});
test('isolates room failures, respects room selection and does not demand unconfigured hall readings', () => {
  const rooms = [room, { id: 'office', name: 'Office', temperature: 'sensor.office_temperature', humidity: 'sensor.office_humidity' }, { id: 'hall', name: 'Hall' }];
  const result = model(readings(), settings, rooms);
  assert.equal(result.rooms.length, 2);
  assert.equal(result.ready, 1); assert.equal(result.unknown, 1);
  assert.equal(model(readings(), { ...settings, room_ids: ['living'] }, rooms).rooms.length, 1);
});
test('opt-in config creates one compact home card and one detail subview without adding a dock destination', () => {
  const absent = generateDashboard({ rooms: [room] }, { states: {} });
  assert.equal(absent.views.some(view => view.path === 'ventilation'), false);
  const config = normalizeConfig({ rooms: [room], ventilation: settings });
  assert.equal(config.ventilation.max_age_minutes, 180);
  for (const id of Object.values(settings)) assert.ok(collectEntities(config).includes(id));
  const result = generateDashboard(config, { states: {} });
  const home = result.views[0].cards[0];
  assert.equal(home.cards.filter(card => card.mode === 'ventilation').length, 1);
  assert.equal(home.cards.find(card => card.mode === 'ventilation').compact, true);
  const details = result.views.find(view => view.path === 'ventilation');
  assert.equal(details.subview, true);
  assert.equal(details.cards[0].cards.length, 1);
  assert.equal(home.navigation.some(link => link.path === 'ventilation'), false);
});
test('configuration rejects ambiguous sources, bad thresholds and unknown or incomplete room references', () => {
  for (const value of [null, false, [], {}, { ...settings, outdoor_humidity: settings.outdoor_temperature },
    { ...settings, max_age_minutes: 0 }, { ...settings, humidity_high: '60' }, { ...settings, min_drying_difference: -1 },
    { ...settings, room_ids: ['missing'] }, { ...settings, room_ids: ['living', 'living'] }, { ...settings, room_ids: [] }]) {
    assert.throws(() => normalizeConfig({ rooms: [room], ventilation: value }), /ventilation/);
  }
  assert.throws(() => normalizeConfig({ rooms: [], ventilation: settings }), /requires at least one room/);
});

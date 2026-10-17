import test from 'node:test';
import assert from 'node:assert/strict';
import { availability, isCleaningActionUnavailable, isOffline, isWallSwitchUnavailable, numericState, stateProblem, monitorGroups, monitorWarnings } from '../src/core/state.js';
test('never-pressed input buttons remain usable without weakening script or device availability', () => {
  assert.equal(isCleaningActionUnavailable('input_button.vacuum_bathroom', { state: 'unknown' }), false);
  assert.equal(isCleaningActionUnavailable('input_button.vacuum_bathroom', { state: '2026-10-17T10:00:00Z' }), false);
  for (const state of [undefined, { state: 'unavailable' }, { state: null }]) assert.equal(isCleaningActionUnavailable('input_button.vacuum_bathroom', state), true);
  for (const entity of ['script.clean_bathroom', 'vacuum.robot', 'sensor.temperature']) assert.equal(isCleaningActionUnavailable(entity, { state: 'unknown' }), true);
});
test('on and off remain usable states; missing, unknown, and unavailable have distinct reasons', () => {
  for (const value of ['on', 'off', 'docked', 'paused']) {
    assert.equal(availability({ state: value }), 'available');
    assert.equal(isOffline({ state: value }), false);
    assert.equal(stateProblem({ state: value }, 'de'), null);
  }
  for (const [state, status, german, english] of [
    [undefined, 'missing', 'Entity nicht gefunden', 'Entity not found'],
    [{ state: 'unknown' }, 'unknown', 'Zustand unbekannt', 'State unknown'],
    [{ state: 'unavailable' }, 'unavailable', 'In Home Assistant nicht verfügbar', 'Unavailable in Home Assistant'],
  ]) {
    assert.equal(availability(state), status);
    assert.equal(stateProblem(state, 'de'), german);
    assert.equal(stateProblem(state, 'en'), english);
  }
});
test('recovered light and vacuum states clear prior availability warnings', () => {
  const monitors = [{ entity: 'light.panel' }, { entity: 'vacuum.robot' }];
  assert.equal(monitorWarnings(monitors, {}, 'en').length, 2);
  assert.deepEqual(monitorWarnings(monitors, { 'light.panel': { state: 'off' }, 'vacuum.robot': { state: 'docked' } }, 'en'), []);
});
test('invalid nonnumeric values do not turn into zero-valued readings', () => {
  for (const state of [null, true, false, {}, [], '', 'NaN', 'Infinity']) assert.equal(numericState({ state }), null);
  assert.equal(numericState({ state: '0' }), 0);
});
test('wall-switch hints are opt-in and never disguise sensor failures or unknown states', () => {
  const device = { entity: 'light.example', wall_switch: true };
  assert.equal(isWallSwitchUnavailable({ state: 'unavailable' }, device), true);
  for (const state of [undefined, { state: 'unknown' }, { state: 'on' }, { state: 'off' }]) assert.equal(isWallSwitchUnavailable(state, device), false);
  for (const item of [{ entity: 'light.example' }, { entity: 'sensor.outdoor', wall_switch: true }, { entity: 'binary_sensor.window', wall_switch: true }]) assert.equal(isWallSwitchUnavailable({ state: 'unavailable' }, item), false);
  assert.equal(isOffline({ state: 'unavailable' }), true, 'A possible wall-switch cause does not make a lamp controllable');
});

test('one unreachable device produces one warning across temperature, humidity and battery', () => {
  const monitors = ['sensor.temperature', 'sensor.moisture', 'sensor.power_level'].map(entity => ({ entity }));
  const states = Object.fromEntries(monitors.map(({ entity }) => [entity, { state: 'unavailable' }]));
  const registries = {
    entities: Object.fromEntries(monitors.map(({ entity }) => [entity, { device_id: 'climate-sensor' }])),
    devices: { 'climate-sensor': { name: 'Climate sensor', name_by_user: 'Wohnzimmer-Sensor' } },
  };
  assert.equal(monitorGroups(monitors, registries).length, 1);
  assert.deepEqual(monitorWarnings(monitors, states, 'de', registries), [{
    entity: 'sensor.temperature', name: 'Wohnzimmer-Sensor', detail: 'Nicht erreichbar', device_id: 'climate-sensor',
  }]);
  assert.equal(monitorWarnings(monitors, states, 'en', registries)[0].detail, 'Unreachable');
  assert.equal(monitorWarnings(monitors, states, 'de').length, 3, 'Unknown device identity must not be guessed from entity names');
});

test('partial device recovery keeps battery and measurement issues visible without claiming the whole device is offline', () => {
  const monitors = [{ entity: 'sensor.temp' }, { entity: 'sensor.humidity' }, { entity: 'sensor.battery', battery_below: 20 }];
  const registries = {
    entities: Object.fromEntries(monitors.map(({ entity }) => [entity, { device_id: 'multi' }])),
    devices: { multi: { name: 'Sensor' } },
  };
  const states = {
    'sensor.temp': { state: '21', attributes: { unit_of_measurement: '°C' } },
    'sensor.humidity': { state: 'unavailable' },
    'sensor.battery': { state: '10', attributes: { device_class: 'battery' } },
  };
  const warnings = monitorWarnings(monitors, states, 'de', registries);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].detail, 'In Home Assistant nicht verfügbar · Batterie: 10%');
  states['sensor.humidity'] = { state: '45', attributes: { unit_of_measurement: '%' } };
  assert.equal(monitorWarnings(monitors, states, 'de', registries)[0].detail, 'Batterie: 10%');
  states['sensor.battery'] = { state: '80', attributes: { device_class: 'battery' } };
  assert.deepEqual(monitorWarnings(monitors, states, 'de', registries), []);
});

test('identical device names stay separate and duplicate monitor entries do not inflate the counts', () => {
  const monitors = [{ entity: 'sensor.one' }, { entity: 'sensor.one' }, { entity: 'sensor.two' }];
  const states = { 'sensor.one': { state: 'unavailable' }, 'sensor.two': { state: 'unknown' } };
  const registries = {
    entities: { 'sensor.one': { device_id: 'one' }, 'sensor.two': { device_id: 'two' } },
    devices: { one: { name: 'Sensor' }, two: { name: 'Sensor' } },
  };
  assert.equal(monitorGroups(monitors, registries).length, 2);
  assert.equal(monitorWarnings(monitors, states, 'de', registries).length, 2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { availability, isCleaningActionUnavailable, isOffline, isWallSwitchUnavailable, numericState, stateProblem, monitorWarnings } from '../src/core/state.js';
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

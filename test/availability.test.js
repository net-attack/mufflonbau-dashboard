import test from 'node:test';
import assert from 'node:assert/strict';
import { availability, isOffline, numericState, stateProblem, monitorWarnings } from '../src/core/state.js';
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

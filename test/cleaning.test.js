import test from 'node:test';
import assert from 'node:assert/strict';
import { cleaningActivity, cleaningCommand, vacuumCommand } from '../src/core/cleaning.js';
import { collectEntities, normalizeConfig } from '../src/core/config.js';

test('vacuum controls use registered actions supported by the robot', () => {
  const services = { vacuum: { start: {}, pause: {}, stop: {}, return_to_base: {} } };
  const robot = state => ({ state, attributes: { supported_features: 8220 } });
  for (const [state, expected] of [['docked', 'start'], ['idle', 'start'], ['paused', 'start'], ['cleaning', 'pause'], ['returning', 'pause']]) {
    assert.equal(vacuumCommand('start_pause', robot(state), services), expected);
  }
  assert.equal(vacuumCommand('return_home', robot('cleaning'), services), 'return_to_base');
  assert.equal(vacuumCommand('stop', robot('cleaning'), services), 'stop');
  assert.equal(vacuumCommand('stop', robot('unavailable'), services), null);
  assert.equal(vacuumCommand('stop', undefined, services), null);
  assert.equal(vacuumCommand('stop', { state: 'idle', attributes: { supported_features: 8192 } }, services), null);
  assert.equal(vacuumCommand('stop', robot('idle'), { vacuum: { start: {} } }), null);
  assert.equal(vacuumCommand('start_pause', robot('idle'), undefined), null);
});

test('fresh whole-home starts use the selected mode; pause and resume retain the current job', () => {
  const cleaning = { entity: 'vacuum.robot', whole_home: {
    vacuum: 'script.vacuum_all', mop: 'input_button.mop_all', clean_genius: 'script.genius_all',
  } };
  const services = { vacuum: { start: {}, pause: {}, stop: {}, return_to_base: {} } };
  const states = { 'vacuum.robot': { state: 'docked', attributes: { supported_features: 8220 } },
    'script.vacuum_all': { state: 'off' }, 'input_button.mop_all': { state: 'unknown' }, 'script.genius_all': { state: 'off' } };
  for (const state of ['docked', 'idle']) {
    states['vacuum.robot'].state = state;
    for (const [mode, expected] of [
      ['vacuum', { domain: 'script', service: 'vacuum_all' }],
      ['mop', { domain: 'input_button', service: 'press', entity: 'input_button.mop_all' }],
      ['clean_genius', { domain: 'script', service: 'genius_all' }],
    ]) assert.deepEqual(cleaningCommand('start_pause', cleaning, mode, states, services), expected);
  }
  for (const [state, service] of [['paused', 'start'], ['cleaning', 'pause'], ['returning', 'pause']]) {
    states['vacuum.robot'].state = state;
    assert.deepEqual(cleaningCommand('start_pause', cleaning, 'mop', states, services), { domain: 'vacuum', service, entity: cleaning.entity });
  }
  for (const [command, service] of [['stop', 'stop'], ['return_home', 'return_to_base']]) {
    assert.deepEqual(cleaningCommand(command, cleaning, 'mop', states, services), { domain: 'vacuum', service, entity: cleaning.entity });
  }
  states['vacuum.robot'].state = 'docked';
  assert.equal(cleaningCommand('start_pause', cleaning, 'missing', states, services), null);
  for (const state of ['unavailable', 'unknown']) {
    states['script.vacuum_all'].state = state;
    assert.equal(cleaningCommand('start_pause', cleaning, 'vacuum', states, services), null);
  }
  delete states['script.vacuum_all'];
  assert.equal(cleaningCommand('start_pause', cleaning, 'vacuum', states, services), null);
  assert.equal(cleaningCommand('start_pause', cleaning, 'mop', states, {}), null);
  states['vacuum.robot'].state = 'unavailable';
  assert.equal(cleaningCommand('start_pause', cleaning, 'mop', states, services), null);
  states['vacuum.robot'].state = 'docked';
  assert.deepEqual(cleaningCommand('start_pause', { entity: cleaning.entity }, 'mop', states, services),
    { domain: 'vacuum', service: 'start', entity: cleaning.entity });
});

test('whole-home actions validate helper domains and appear in collected entities', () => {
  const config = normalizeConfig({ cleaning: { entity: 'vacuum.robot', whole_home: { vacuum: 'script.vacuum_all', mop: 'input_button.mop_all' } } });
  assert.ok(collectEntities(config).includes('script.vacuum_all'));
  assert.ok(collectEntities(config).includes('input_button.mop_all'));
  for (const whole_home of [null, [], 'script.vacuum_all', { vacuum: 'light.room' }, { mop: null }, { typo: 'script.vacuum_all' }]) {
    assert.throws(() => normalizeConfig({ cleaning: { whole_home } }), /cleaning.whole_home/);
  }
});

test('running cleaning type comes from robot attributes', () => {
  for (const [mode, label] of [
    ['Sweeping', 'Saugen'], ['Mopping', 'Wischen'],
    ['Sweeping and mopping', 'Saugen und Wischen'], ['Mop after vacuum', 'Erst saugen, dann wischen'],
  ]) assert.equal(cleaningActivity({ state: 'cleaning', attributes: { cleaning_mode: mode, cleangenius: 'Off' } }, 'de').label, label);
});

test('CleanGenius takes precedence over the underlying cleaning mode and reports its sequence', () => {
  for (const genius of [true, 'Routine cleaning', 'deep_cleaning', 'on']) {
    assert.deepEqual(cleaningActivity({ state: 'cleaning', attributes: {
      cleaning_mode: 'Sweeping', cleangenius: genius, cleangenius_mode: 'Mop after vacuum',
    } }, 'de'), { label: 'CleanGenius', detail: 'Erst saugen, dann wischen' });
  }
  assert.equal(cleaningActivity({ state: 'paused', attributes: { cleaning_mode: 'Mopping' } }, 'en').label, 'Mop');
  assert.equal(cleaningActivity({ state: 'cleaning', attributes: { cleangenius: true, cleangenius_mode: 'vacuum_and_mop' } }, 'en').detail, 'Vacuum and mop');
});

test('idle and unavailable robots do not claim a running mode; unreported modes are explicit', () => {
  for (const state of ['docked', 'idle', 'returning', 'unavailable', 'unknown']) {
    assert.equal(cleaningActivity({ state, attributes: { cleangenius: 'Routine cleaning' } }, 'de'), null);
  }
  assert.equal(cleaningActivity(undefined, 'de'), null);
  assert.equal(cleaningActivity({ state: 'cleaning', attributes: {} }, 'de').label, 'Reinigungsart nicht gemeldet');
  assert.equal(cleaningActivity({ state: 'cleaning', attributes: { cleaning_mode: 'unsupported' } }, 'en').label, 'Cleaning type not reported');
});

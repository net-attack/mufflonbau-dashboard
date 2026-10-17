import test from 'node:test';
import assert from 'node:assert/strict';
import { cleaningActivity } from '../src/core/cleaning.js';

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

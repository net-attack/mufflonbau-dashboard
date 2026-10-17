import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, collectEntities } from '../src/core/config.js';
import { generateDashboard } from '../src/strategy.js';
import { laundryStatus } from '../src/core/laundry.js';

const item = { id: 'washer', name: { en: 'Washer', de: 'Waschmaschine' }, power: 'sensor.washer_power', status: 'input_select.washer_phase', plug: 'switch.washer', last_finished: 'input_datetime.washer_finished' };
test('laundry is opt-in and collects read-only source and backend helper entities', () => {
  assert.deepEqual(normalizeConfig({}).laundry, []);
  const config = normalizeConfig({ laundry: [item] });
  for (const id of [item.power, item.status, item.plug, item.last_finished]) assert.ok(collectEntities(config).includes(id));
  const home = generateDashboard({ laundry: [item] }, { states: {} }).views[0].cards[0].cards;
  assert.equal(home.filter(card => card.type === 'custom:mufflonbau-laundry').length, 1);
  assert.equal(home.filter(card => card.mode === 'message').length, 0);
  assert.throws(() => normalizeConfig({ laundry: [{ ...item, status: 'switch.washer' }] }), /input_select/);
  assert.throws(() => normalizeConfig({ laundry: [item, item] }), /unique/);
});
test('unavailable readings never look ready/running, but latched completion survives', () => {
  const states = { 'sensor.washer_power': { state: '0', attributes: { unit_of_measurement: 'W' } }, 'switch.washer': { state: 'on' } };
  assert.equal(laundryStatus(item, states).status, 'missing');
  states[item.status] = { state: 'idle' };
  assert.equal(laundryStatus(item, states).power, 0);
  assert.equal(laundryStatus(item, states, 'de').label, 'Bereit');
  states[item.power] = { state: 'unavailable' };
  assert.equal(laundryStatus(item, states).status, 'unavailable');
  states[item.status] = { state: 'finished' };
  assert.equal(laundryStatus(item, states).status, 'finished');
  states[item.status] = { state: 'running' }; states[item.plug] = { state: 'off' };
  assert.equal(laundryStatus(item, states).status, 'unavailable');
});
test('finished candidate stays latched and power needs a nonnegative W reading', () => {
  const states = { [item.power]: { state: '30', attributes: { unit_of_measurement: 'W' } }, [item.plug]: { state: 'on' }, [item.status]: { state: 'starting_after_finished' } };
  assert.equal(laundryStatus(item, states).status, 'finished');
  for (const [value, unit] of [['-1', 'W'], ['0.2', 'kW'], ['nan', 'W'], ['Infinity', 'W'], ['0', undefined]]) {
    states[item.power] = { state: value, attributes: { unit_of_measurement: unit } };
    assert.equal(laundryStatus(item, states).power, null);
    assert.equal(laundryStatus(item, states).status, 'finished');
    states[item.status] = { state: 'running' };
    assert.equal(laundryStatus(item, states).status, 'unavailable');
    states[item.status] = { state: 'starting_after_finished' };
  }
});

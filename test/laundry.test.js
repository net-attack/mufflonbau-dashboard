import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, collectEntities } from '../src/core/config.js';
import { generateDashboard } from '../src/strategy.js';
import { laundryStatus, laundryTimestamp } from '../src/core/laundry.js';

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

test('completion confirmation survives new cycles and stays independent for each appliance', () => {
  const washer = { ...item, acknowledged: 'input_datetime.washer_ack' };
  const dryer = { ...item, id: 'dryer', status: 'input_select.dryer_phase', last_finished: 'input_datetime.dryer_finished', acknowledged: 'input_datetime.dryer_ack' };
  const finished = 1792327200;
  const stamp = timestamp => ({ state: '2026-10-18 13:20:00', attributes: { timestamp } });
  const states = { [item.power]: { state: '200', attributes: { unit_of_measurement: 'W' } }, [item.plug]: { state: 'on' },
    [washer.status]: { state: 'finished' }, [washer.last_finished]: stamp(finished), [washer.acknowledged]: stamp(0),
    [dryer.status]: { state: 'running' }, [dryer.last_finished]: stamp(0), [dryer.acknowledged]: stamp(0) };
  assert.ok(collectEntities(normalizeConfig({ laundry: [washer] })).includes(washer.acknowledged));
  assert.equal(laundryStatus(washer, states).pending, true);
  assert.equal(laundryStatus(dryer, states).pending, false);
  states[washer.status] = { state: 'running' };
  assert.equal(laundryStatus(washer, states).pending, true);
  assert.equal(laundryStatus(washer, states).status, 'running');
  states[washer.acknowledged] = stamp(finished);
  states[washer.last_finished] = stamp(finished + .75);
  assert.equal(laundryStatus(washer, states).pending, false);
  assert.equal(laundryStatus(washer, states).status, 'running', 'Confirming old completion must not reset the new cycle');
  assert.equal(laundryStatus(dryer, states).status, 'running');
  states[washer.last_finished] = stamp(finished + 3600);
  states[washer.status] = { state: 'finished' };
  assert.equal(laundryStatus(washer, states).pending, true, 'A newer completion survives an older confirmation');
  states[washer.power] = { state: 'unavailable' };
  assert.equal(laundryStatus(washer, states).pending, true);
  assert.equal(laundryTimestamp(stamp(finished)), finished, 'Use the HA timestamp, not the timezone-less state string');
  assert.equal(laundryTimestamp({ state: 'unavailable', attributes: { timestamp: finished } }), null);
  assert.throws(() => normalizeConfig({ laundry: [{ ...washer, acknowledged: washer.last_finished }] }), /separate input_datetime/);
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

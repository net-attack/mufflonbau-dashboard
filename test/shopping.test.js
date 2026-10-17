import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, collectEntities } from '../src/core/config.js';
import { generateDashboard } from '../src/strategy.js';
import { shoppingStatus } from '../src/core/shopping.js';

const shopping = { entity: 'todo.family_shopping', name: 'Einkaufsliste' };
const hass = { states: { [shopping.entity]: { state: '0', attributes: { supported_features: 119 } } }, services: { todo: { add_item: {} } } };

test('shopping uses an explicit todo entity and stays optional', () => {
  const config = normalizeConfig({ shopping });
  assert.ok(collectEntities(config).includes(shopping.entity));
  assert.throws(() => normalizeConfig({ shopping: { entity: 'sensor.shopping' } }), /todo/);
  assert.throws(() => normalizeConfig({ shopping: { ...shopping, name: '' } }), /nonempty/);
  assert.ok(!generateDashboard({}, hass).views.some(v => v.path === 'shopping'));
  const dashboard = generateDashboard({ shopping, language: 'de' }, hass);
  const home = dashboard.views.find(v => v.path === 'home').cards[0];
  assert.equal(home.cards.filter(c => c.type === 'custom:mufflonbau-shopping').length, 1);
  const details = dashboard.views.find(v => v.path === 'shopping');
  assert.equal(details.subview, true);
  const list = details.cards[0].cards[0];
  assert.deepEqual(list, { type: 'todo-list', entity: shopping.entity, title: 'Einkaufsliste', hide_create: false, hide_completed: true, item_tap_action: 'toggle' });
});

test('zero is an empty writable list; invalid and offline states never claim empty', () => {
  assert.deepEqual(shoppingStatus(shopping, hass, 'de'), { count: 0, canAdd: true, problem: null });
  for (const state of ['unknown', 'unavailable', 'bad', '-1', '1.5']) {
    const status = shoppingStatus(shopping, { ...hass, states: { [shopping.entity]: { state, attributes: { supported_features: 119 } } } });
    assert.equal(status.count, null); assert.equal(status.canAdd, false); assert.ok(status.problem);
  }
  assert.equal(shoppingStatus(shopping, { states: {} }).canAdd, false);
  assert.equal(shoppingStatus(shopping, { ...hass, services: {} }).canAdd, false);
  assert.equal(shoppingStatus(shopping, { ...hass, states: { [shopping.entity]: { state: '2', attributes: { supported_features: 4 } } } }).canAdd, false);
});

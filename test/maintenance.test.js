import test from 'node:test';
import assert from 'node:assert/strict';
import { maintenanceStatus } from '../src/core/maintenance.js';
import { collectEntities, normalizeConfig } from '../src/core/config.js';
import { categorizeEntities } from '../src/core/expert.js';
import { generateDashboard } from '../src/strategy.js';

const item = { name: 'Filter', percent: 'sensor.filter_left', remaining: 'sensor.filter_time' };
const sensor = (value, unit) => ({ state: String(value), attributes: { unit_of_measurement: unit } });
const status = (value, overrides = {}, time = sensor(1, 'h')) => maintenanceStatus({ ...item, ...overrides }, { 'sensor.filter_left': sensor(value, '%'), 'sensor.filter_time': time }, 'de');

test('maintenance uses actual remaining values and a configurable inclusive percentage threshold', () => {
  assert.equal(status(0).status, 'due');
  assert.equal(status(1).status, 'soon');
  assert.equal(status(10).status, 'soon');
  assert.equal(status(11).status, 'okay');
  assert.equal(status(25, { warning_below: 25 }).status, 'soon');
  assert.equal(status(1, { warning_below: 0 }).status, 'okay');
  assert.equal(status(80, {}, sensor(0, 'd')).status, 'due');
  assert.equal(status(10.5).percent.display, '10,5 %');
  assert.equal(status(50, {}, sensor(3, 'd')).remaining.display, '3 d');
  assert.equal(status(50, {}, sensor(3, 'h')).remaining.display, '3 h');
});

test('missing, unavailable, invalid and unconfigured readings never become fabricated healthy values', () => {
  assert.equal(maintenanceStatus(item, {}, 'de').percent.problem, 'Entity nicht gefunden');
  assert.match(status('unknown').percent.problem, /unbekannt/);
  assert.match(status('unavailable').percent.problem, /nicht verfügbar/);
  for (const invalid of ['', 'NaN', -1, 101, Infinity]) assert.equal(status(invalid).status, 'unknown');
  for (const unit of ['h', undefined]) {
    const result = maintenanceStatus(item, { 'sensor.filter_left': sensor(50, unit), 'sensor.filter_time': sensor(1, 'h') }, 'de');
    assert.equal(result.status, 'unknown');
  }
  assert.equal(status(50, {}, sensor(1, undefined)).status, 'unknown');
  assert.equal(status(1, {}, sensor('unavailable', 'h')).status, 'soon');
  assert.equal(status(1, {}, sensor('unavailable', 'h')).incomplete, true);
  assert.equal(maintenanceStatus({ name: 'Filter', remaining: item.remaining }, { 'sensor.filter_time': sensor(3, 'h') }, 'de').status, 'unknown');
});

test('optional maintenance stays on cleaning and is included in expert entity collection', () => {
  const config = normalizeConfig({ cleaning: { theme: 'flusenfels', maintenance: [item] } });
  assert.deepEqual(collectEntities(config), [item.percent, item.remaining]);
  assert.deepEqual(categorizeEntities(collectEntities(config), config).filter(item => item.category === 'cleaning').map(item => item.entity), [item.percent, item.remaining]);
  const dashboard = generateDashboard(config, { states: {} });
  const card = dashboard.views.find(view => view.path === 'cleaning').cards[0].cards[0];
  assert.equal(card.type, 'custom:mufflonbau-maintenance');
  assert.deepEqual(card.cleaning.maintenance, [item]);
  assert.ok(!generateDashboard({ cleaning: { entity: 'vacuum.robot' } }, { states: {} }).views.find(view => view.path === 'cleaning').cards[0].cards.some(card => card.type === 'custom:mufflonbau-maintenance'));
});

test('maintenance YAML rejects unsupported targets, duplicate sensors and invalid thresholds', () => {
  for (const invalid of [null, {}, 'sensor.filter']) assert.throws(() => normalizeConfig({ cleaning: { maintenance: invalid } }), /maintenance/);
  for (const invalid of [{ name: 'Filter' }, { ...item, percent: 'light.filter' }, { ...item, warning_below: -1 }, { ...item, warning_below: 101 }, { ...item, warning_below: '10' }, { remaining: item.remaining, name: 'Filter', warning_below: 10 }]) {
    assert.throws(() => normalizeConfig({ cleaning: { maintenance: [invalid] } }), /maintenance\[0\]/);
  }
  assert.throws(() => normalizeConfig({ cleaning: { maintenance: [item, item] } }), /duplicate/);
});

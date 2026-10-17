import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, collectEntities } from '../src/core/config.js';
import { clientSummary, discoverAdminSources, numericGroups } from '../src/core/admin.js';
import { generateDashboard } from '../src/strategy.js';
import { fetchHistory, historyPoints, historyPath } from '../src/core/history.js';
import { categorizeEntities } from '../src/core/expert.js';

test('admin validates explicit sources, deduplicates and includes them in expert details', () => {
  const config = normalizeConfig({ admin: { internet: ['binary_sensor.wan'], host: ['sensor.cpu', 'sensor.cpu'], clients: ['device_tracker.tablet'] } });
  assert.deepEqual(config.admin.host, ['sensor.cpu']);
  assert.ok(collectEntities(config).includes('device_tracker.tablet'));
  assert.throws(() => normalizeConfig({ admin: { clients: ['person.phone'] } }), /admin.clients\[0\].*device_tracker/);
  assert.throws(() => normalizeConfig({ admin: { host: 'sensor.cpu' } }), /admin.host/);
  assert.throws(() => normalizeConfig({ admin: { internet: [null] } }), /admin.internet\[0\]/);
});
test('network counts retain unknowns and do not equate arbitrary locations with disconnected Wi-Fi', () => {
  const states = Object.fromEntries(['home', 'not_home', 'unknown', 'unavailable', 'office'].map((state, index) => [`device_tracker.d${index}`, { state }]));
  assert.deepEqual(clientSummary([...Object.keys(states), 'device_tracker.missing'], states), { connected: 1, away: 1, unknown: 4, total: 6 });
});
test('admin auto-discovers Speedtest, router Wi-Fi clients and Raspberry Pi sensors without matching DECT readings', () => {
  const discovered = discoverAdminSources({ internet: [], network: [], host: [], clients: [] }, {
    'sensor.speedtest_download': { attributes: { friendly_name: 'Speedtest Download' } },
    'sensor.fritz_dect_temperature': { attributes: { friendly_name: 'FRITZ DECT Temperature', unit_of_measurement: '°C' } },
    'sensor.fritzbox_wifi_devices': { attributes: { friendly_name: 'FRITZ!Box Wi-Fi devices' } },
    'device_tracker.phone': { state: 'home', attributes: { source_type: 'router', friendly_name: 'Phone' } },
    'sensor.processor_temperature': { attributes: { unit_of_measurement: '°C' } },
    'sensor.memory_use_percent': { attributes: { unit_of_measurement: '%' } },
    'sensor.room_temperature': { attributes: { friendly_name: 'Room temperature', unit_of_measurement: '°C' } },
  });
  assert.deepEqual(discovered.internet, ['sensor.speedtest_download']);
  assert.deepEqual(discovered.network, ['sensor.fritzbox_wifi_devices']);
  assert.deepEqual(discovered.clients, ['device_tracker.phone']);
  assert.deepEqual(discovered.host, ['sensor.processor_temperature', 'sensor.memory_use_percent']);
});
test('admin is one high-level destination; technical subviews are reached by drill-down', () => {
  const dashboard = generateDashboard({ admin: { host: ['sensor.cpu', 'sensor.temp'] } }, { states: {
    'sensor.cpu': { state: '20', attributes: { unit_of_measurement: '%' } },
    'sensor.temp': { state: '48', attributes: { unit_of_measurement: '°C' } },
  } });
  const navigation = dashboard.views[0].cards[0].navigation;
  assert.ok(navigation.some(item => item.path === 'admin'));
  assert.ok(!navigation.some(item => /^admin-|expert/.test(item.path)));
  assert.equal(dashboard.views.find(item => item.path === 'admin-host').cards[0].cards.filter(card => card.type === 'custom:mufflonbau-history').length, 2);
});
test('admin assigns each entity once and preserves explicit sections over automatic matching', () => {
  const sources = discoverAdminSources({
    internet: ['sensor.shared', 'sensor.shared'], network: ['sensor.shared', 'sensor.manual_download'], host: ['sensor.shared'], clients: ['device_tracker.tablet', 'device_tracker.tablet'],
  }, {
    'sensor.manual_download': {},
    'sensor.router_wan_ip': {},
    'binary_sensor.wifi_connection': {},
    'sensor.processor_network_usage': {},
    'sensor.lan_connections': {},
    'sensor.plant_temperature': {},
    'sensor.wand_temperature': {},
    'sensor.camping_temperature': {},
    'device_tracker.tablet': { attributes: { source_type: 'router' } },
  });
  assert.deepEqual(sources, {
    internet: ['sensor.shared', 'sensor.router_wan_ip'],
    network: ['sensor.manual_download', 'binary_sensor.wifi_connection', 'sensor.lan_connections'],
    host: ['sensor.processor_network_usage'], clients: ['device_tracker.tablet'],
  });
  assert.equal(new Set(Object.values(sources).flat()).size, Object.values(sources).flat().length);
});
test('expert categories deduplicate IDs while retaining different sensors and configured helpers', () => {
  const config = {
    admin: { internet: ['sensor.download'], network: ['sensor.wifi'], clients: ['device_tracker.tablet'], host: ['sensor.cpu_temperature'] },
    rooms: [{ temperature: 'sensor.room_temperature', humidity: 'sensor.room_humidity', cleaning: { clean_genius: 'script.clean_room' } }],
    monitors: [{ entity: 'sensor.room_temperature' }, { entity: 'sensor.battery' }],
  };
  const ids = ['sensor.download', 'sensor.wifi', 'device_tracker.tablet', 'sensor.cpu_temperature', 'sensor.room_temperature', 'sensor.room_humidity', 'script.clean_room', 'sensor.battery', 'light.room', 'switch.socket', 'automation.night', 'input_boolean.guest', 'person.resident', 'calendar.home', 'sensor.other', 'sensor.another', 'sensor.other'];
  const entries = categorizeEntities(ids, config, {
    'sensor.cpu_temperature': { attributes: { device_class: 'temperature' } },
    'sensor.other': { state: '12', attributes: { friendly_name: 'Same' } }, 'sensor.another': { state: '12', attributes: { friendly_name: 'Same' } },
  });
  assert.deepEqual(entries.map(entry => entry.category), ['internet', 'network', 'network', 'host', 'climate', 'climate', 'cleaning', 'system', 'lights', 'switches', 'automations', 'helpers', 'people', 'calendar', 'sensors', 'sensors']);
  assert.deepEqual(entries.map(entry => entry.entity), [...new Set(ids)]);
});
test('generated network and Pi views use live auto-discovered Home Assistant entities', () => {
  const dashboard = generateDashboard({}, { states: {
    'sensor.speedtest_download': { state: '240', attributes: { unit_of_measurement: 'Mbit/s' } },
    'binary_sensor.fritz_connection': { state: 'on', attributes: { friendly_name: 'FRITZ!Box connection' } },
    'device_tracker.tablet': { state: 'home', attributes: { source_type: 'router' } },
    'sensor.processor_temperature': { state: '51', attributes: { unit_of_measurement: '°C' } },
  } });
  const network = dashboard.views.find(view => view.path === 'admin-network').cards[0].cards[0];
  const host = dashboard.views.find(view => view.path === 'admin-host').cards[0].cards[0];
  assert.deepEqual(network.admin.network, []);
  assert.deepEqual(network.admin.internet, ['sensor.speedtest_download', 'binary_sensor.fritz_connection']);
  assert.deepEqual(network.admin.clients, ['device_tracker.tablet']);
  assert.deepEqual(host.admin.host, ['sensor.processor_temperature']);
  assert.ok(dashboard.views.find(view => view.path === 'expert').cards[0].cards[0].entities.includes('sensor.processor_temperature'));
});
test('history groups never mix units or unrelated device classes', () => {
  const states = { a: { state: '10', attributes: { unit_of_measurement: '%' } }, b: { state: '20', attributes: { unit_of_measurement: '%' } }, c: { state: '10', attributes: { unit_of_measurement: '%', device_class: 'battery' } }, d: { state: 'unavailable' }, e: { state: 'unavailable', attributes: { unit_of_measurement: '°C' } } };
  assert.deepEqual(numericGroups(['a', 'b', 'c', 'd', 'e', 'missing'], states), [['a', 'b'], ['c'], ['e']]);
});
test('compact Recorder history preserves gaps, zero and the initial state', () => {
  const points = historyPoints([{ s: '2', lu: 1 }, { s: '0', lu: 3 }, { s: 'unavailable', lu: 4 }, { s: '5', lu: 5 }, { s: '6', lu: 7 }], 2000, 6000);
  assert.deepEqual(points, [{ time: 2000, value: 2 }, { time: 3000, value: 0 }, { time: 4000, value: null }, { time: 5000, value: 5 }]);
  const path = historyPath(points, 2000, 6000, 0, 5);
  assert.equal((path.match(/M/g) ?? []).length, 2);
  assert.ok(!/NaN|Infinity/.test(path));
});
test('history requests only selected entities and uses the authenticated HA connection', async () => {
  const calls = []; const hass = { callWS: async payload => { calls.push(payload); return {}; } };
  await fetchHistory(hass, [], 0, 1000);
  assert.equal(calls.length, 0);
  await fetchHistory(hass, ['sensor.cpu'], 0, 1000);
  assert.deepEqual(calls[0], { type: 'history/history_during_period', entity_ids: ['sensor.cpu'], start_time: '1970-01-01T00:00:00.000Z', end_time: '1970-01-01T00:00:01.000Z', minimal_response: true, no_attributes: true });
});

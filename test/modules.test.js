import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, collectEntities } from '../src/core/config.js';
import { generateDashboard } from '../src/strategy.js';
import { monitorWarnings, numericState, appearanceMode } from '../src/core/state.js';
import { roomLightHierarchy } from '../src/core/light-hierarchy.js';
const fixture = {
  language: 'en', people: ['person.resident'], weather: 'weather.home', calendars: ['calendar.family'],
  rooms: [{ id: 'living', name: { en: 'Living room', de: 'Wohnzimmer' },
    temperature: 'sensor.temperature', humidity: 'sensor.humidity', dew_point: 'sensor.dew_point',
    lights: ['light.living'], entities: ['climate.living'], cleaning: { vacuum: 'input_button.vacuum_living', mop: 'input_button.mop_living' },
    position: { x: 0, y: 0, width: 300, height: 180 } }],
  cleaning: { entity: 'vacuum.robot', battery: 'sensor.robot_battery', current_room: 'sensor.robot_room', map: 'camera.robot_map' },
  monitors: [{ entity: 'sensor.battery', battery_below: 20 }, { entity: 'sensor.temperature' }],
};
function cardsIn(value) {
  return value.flatMap(card => [card, ...cardsIn(card.cards ?? [])]);
}
test('generates connected feature views with explicit types and localized room names', () => {
  const before = JSON.stringify(fixture);
  const result = generateDashboard(fixture, { states: {} });
  assert.deepEqual(result.views.map(view => view.path), ['home', 'rooms', 'room-living', 'presence', 'climate', 'cleaning', 'calendar', 'system', 'admin', 'admin-internet', 'admin-network', 'admin-host', 'expert']);
  assert.equal(result.views.find(view => view.path === 'presence').subview, true);
  assert.equal(result.views[0].cards[0].cards.some(card => card.mode === 'climate' || card.mode === 'people'), false);
  assert.ok(result.views[0].cards[0].cards.some(card => card.mode === 'room-summary'));
  assert.ok(result.views[0].cards[0].cards.some(card => card.mode === 'presence-summary'));
  assert.ok(result.views.every(view => view.type === 'panel'));
  assert.equal(result.views.find(view => view.path === 'room-living').title, 'Living room');
  const german = generateDashboard({ ...fixture, language: 'de' }, { states: {} });
  assert.equal(german.views.find(view => view.path === 'room-living').title, 'Wohnzimmer');
  assert.equal(JSON.stringify(fixture), before);
  const cards = cardsIn(result.views.flatMap(view => view.cards));
  assert.ok(cards.every(card => typeof card.type === 'string'));
  assert.ok(!cards.some(card => /bubble-card|button-card/.test(card.type)));
  const history = cards.find(card => card.type === 'history-graph');
  assert.deepEqual(history.entities, ['sensor.temperature', 'sensor.humidity', 'sensor.dew_point']);
  const climate = result.views.find(view => view.path === 'climate').cards[0].cards;
  assert.equal(climate.filter(card => card.mode === 'climate').length, 1);
  assert.equal(climate[0].layout, 'table');
  assert.equal(climate[0].rooms.length, 1);
  const links = cards.filter(card => card.tap_action?.action === 'navigate');
  assert.ok(links.every(card => result.views.some(view => view.path === card.tap_action.navigation_path)));
});
test('collapses configured Hue group members in room views but retains them in expert details', () => {
  const room = { id: 'kitchen', name: 'Kitchen', lights: ['light.kitchen', 'light.strip_one', 'light.strip_two'] };
  const hierarchy = roomLightHierarchy(room, {
    'light.kitchen': { state: 'off', attributes: { entity_id: ['light.strip_one', 'light.strip_two', 'light.not_configured'] } },
  });
  assert.deepEqual(hierarchy, { lights: ['light.kitchen'], members: ['light.strip_one', 'light.strip_two'] });
  const config = { language: 'en', rooms: [room] };
  const dashboard = generateDashboard(config, { states: {
    'light.kitchen': { state: 'off', attributes: { entity_id: ['light.strip_one', 'light.strip_two'] } },
  } });
  const views = dashboard.views;
  const roomCards = views.find(item => item.path === 'room-kitchen').cards[0].cards;
  assert.equal(roomCards.filter(card => card.entity === 'light.kitchen').length, 1);
  assert.equal(roomCards.some(card => ['light.strip_one', 'light.strip_two'].includes(card.entity)), false);
  const expert = views.find(item => item.path === 'expert').cards[0].cards;
  assert.deepEqual(expert.find(card => card.type === 'entities').entities, ['light.kitchen', 'light.strip_one', 'light.strip_two']);
  assert.deepEqual(room.lights, ['light.kitchen', 'light.strip_one', 'light.strip_two']);
});
test('cleaning buttons target exactly the configured helper and do not invent room IDs', () => {
  const result = generateDashboard(fixture, { states: {} });
  const cards = cardsIn(result.views.find(view => view.path === 'cleaning').cards);
  const cleaning = cards.find(card => card.type === 'custom:mufflonbau-cleaning');
  assert.deepEqual(cleaning.rooms.find(room => room.id === 'living').cleaning,
    { vacuum: 'input_button.vacuum_living', mop: 'input_button.mop_living' });
  assert.equal(result.views.find(item => item.path === 'calendar').cards[0].full_view, true);
  assert.equal(result.views.find(item => item.path === 'calendar').fullView, true);
});
test('CleanGenius keeps explicit per-room helpers and scripts without inferring Dreame room IDs', () => {
  const room = { id: 'living', name: 'Living room', cleaning: { vacuum: 'input_button.vacuum_living', clean_genius: 'script.clean_genius_living' } };
  const config = normalizeConfig({ rooms: [room] });
  assert.deepEqual(config.rooms[0].cleaning, room.cleaning);
  assert.ok(collectEntities(config).includes('script.clean_genius_living'));
  assert.throws(() => normalizeConfig({ rooms: [{ ...room, cleaning: { clean_genius: 'select.robot_mode' } }] }), /input_button or script/);
});
test('expert entity collection is complete and deduplicated', () => {
  const config = normalizeConfig({ ...fixture, expert_entities: ['sensor.temperature', 'sensor.extra'] });
  const ids = collectEntities(config);
  assert.equal(ids.filter(id => id === 'sensor.temperature').length, 1);
  for (const id of ['person.resident', 'sensor.extra', 'camera.robot_map', 'input_button.mop_living', 'sensor.battery']) assert.ok(ids.includes(id));
});
test('invalid nested configuration produces actionable paths', () => {
  const cases = [
    [{ rooms: {} }, /rooms must be an array/],
    [{ rooms: [{ id: 'bad id', name: 'Bad' }] }, /rooms\[0\].id/],
    [{ rooms: [{ id: 'living', name: 'One' }, { id: 'living', name: 'Two' }] }, /unique/],
    [{ rooms: [{ id: 'living', name: 'Room', cleaning: { vacuum: 'light.room' } }] }, /input_button/],
    [{ rooms: [{ id: 'living', name: 'Room', position: { x: 0, y: 0, width: -1, height: 2 } }] }, /position.width/],
    [{ monitors: [{ entity: 'sensor.battery', battery_below: 101 }] }, /battery_below/],
    [{ cleaning: { map: null } }, /cleaning.map/],
  ];
  for (const [config, error] of cases) assert.throws(() => normalizeConfig(config), error);
});
test('warnings handle missing, unavailable, invalid, and threshold boundary values', () => {
  const monitors = [{ entity: 'sensor.battery', battery_below: 20, name: { en: 'Battery', de: 'Batterie' } }];
  const warnings = state => monitorWarnings(monitors, state === undefined ? {} : { 'sensor.battery': { state } }, 'de');
  for (const [value, detail] of [[undefined, 'Entity nicht gefunden'], ['unknown', 'Zustand unbekannt'], ['unavailable', 'In Home Assistant nicht verfügbar'], ['NaN', 'Ungültiger Sensorwert'], ['', 'Ungültiger Sensorwert'], ['Infinity', 'Ungültiger Sensorwert']]) {
    assert.equal(warnings(value)[0].detail, detail);
  }
  assert.equal(warnings('20').length, 0);
  assert.equal(warnings('0')[0].detail, 'Batterie: 0%');
  assert.equal(warnings('19')[0].name, 'Batterie');
  assert.equal(numericState({ state: '0' }), 0);
});
test('system checks warn on low batteries and broken numeric sensors without listing healthy readings', () => {
  const warnings = monitorWarnings([
    { entity: 'sensor.phone_battery' }, { entity: 'sensor.room_temperature' }, { entity: 'sensor.status' },
  ], {
    'sensor.phone_battery': { state: '95', attributes: { unit_of_measurement: '%' } },
    'sensor.room_temperature': { state: 'NaN', attributes: { unit_of_measurement: '°C' } },
    'sensor.status': { state: 'ready', attributes: {} },
  }, 'de');
  assert.deepEqual(warnings.map(item => [item.entity, item.detail]), [['sensor.room_temperature', 'Ungültiger Sensorwert']]);
  assert.equal(monitorWarnings([{ entity: 'sensor.phone_battery' }], { 'sensor.phone_battery': { state: '19', attributes: { unit_of_measurement: '%' } } }, 'de')[0].detail, 'Batterie: 19%');
});
test('appearance follows the sun and falls back to the HA theme', () => {
  assert.equal(appearanceMode({}, { 'sun.sun': { state: 'above_horizon' } }, true), 'ambient');
  assert.equal(appearanceMode({}, { 'sun.sun': { state: 'below_horizon' } }, false), 'night');
  assert.equal(appearanceMode({ night_person: 'person.one' }, { 'person.one': { state: 'home' }, 'sun.sun': { state: 'above_horizon' } }), 'ambient');
  assert.equal(appearanceMode({}, {}, true), 'night');
  assert.equal(appearanceMode({ mode: 'ambient' }, {}, true), 'ambient');
});

test('enables kiosk mode and hides the header by default while allowing explicit overrides', () => {
  const kioskMode = { kiosk: true, hide_header: true };
  assert.deepEqual(generateDashboard({ kiosk_mode: kioskMode }, { states: {} }).kiosk_mode, kioskMode);
  assert.deepEqual(generateDashboard({}, { states: {} }).kiosk_mode, kioskMode);
  assert.throws(() => normalizeConfig({ kiosk_mode: { kiosk: 'yes' } }), /kiosk_mode/);
});

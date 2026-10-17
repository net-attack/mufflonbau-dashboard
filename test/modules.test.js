import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, collectEntities } from '../src/core/config.js';
import { generateDashboard } from '../src/strategy.js';
import { monitorWarnings, numericState, appearanceMode } from '../src/core/state.js';
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
  assert.deepEqual(result.views.map(view => view.path), ['home', 'rooms', 'room-living', 'climate', 'cleaning', 'calendar', 'system', 'expert']);
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
  const links = cards.filter(card => card.tap_action?.action === 'navigate');
  assert.ok(links.every(card => result.views.some(view => view.path === card.tap_action.navigation_path)));
});
test('cleaning buttons target exactly the configured helper and do not invent room IDs', () => {
  const result = generateDashboard(fixture, { states: {} });
  const cards = cardsIn(result.views.find(view => view.path === 'cleaning').cards);
  const actions = cards.filter(card => card.tap_action?.action === 'perform-action');
  assert.deepEqual(actions.map(card => card.tap_action), [
    { action: 'perform-action', perform_action: 'input_button.press', target: { entity_id: 'input_button.vacuum_living' } },
    { action: 'perform-action', perform_action: 'input_button.press', target: { entity_id: 'input_button.mop_living' } },
  ]);
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
  for (const value of [undefined, 'unknown', 'unavailable', 'NaN', '', 'Infinity']) {
    assert.equal(warnings(value)[0].detail, 'Offline');
  }
  assert.equal(warnings('20').length, 0);
  assert.equal(warnings('0')[0].detail, 'Batterie: 0%');
  assert.equal(warnings('19')[0].name, 'Batterie');
  assert.equal(numericState({ state: '0' }), 0);
});
test('appearance preserves the old presence rule and falls back to the HA theme', () => {
  const config = { night_person: 'person.one', ambient_person: 'person.two' };
  assert.equal(appearanceMode(config, { 'person.one': { state: 'home' }, 'person.two': { state: 'not_home' } }), 'night');
  assert.equal(appearanceMode(config, { 'person.one': { state: 'home' }, 'person.two': { state: 'home' } }), 'ambient');
  assert.equal(appearanceMode({}, {}, true), 'night');
  assert.equal(appearanceMode({ mode: 'ambient' }, {}, true), 'ambient');
});

test('leaves header, sidebar, and kiosk settings to the dashboard owner', () => {
  for (const config of [{}, { kiosk_mode: { kiosk: true, hide_header: true, hide_sidebar: true } }]) {
    const result = generateDashboard(config, { states: {} });
    for (const key of ['kiosk_mode', 'kiosk', 'hide_header', 'hide_sidebar']) assert.ok(!Object.hasOwn(result, key));
  }
});

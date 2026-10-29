import test from 'node:test';
import assert from 'node:assert/strict';
import { alertSnapshot, weatherSystemWarning, warningHash, radarHash } from '../src/core/weather-alerts.js';
import { generateDashboard } from '../src/strategy.js';
import { normalizeConfig } from '../src/core/config.js';

test('weather extension is opt-in and uses standalone popups in every view', () => {
  const config = { rooms: [{ id: 'test', name: 'Test' }], weather_alerts: {
    entity: 'sensor.test_alerts', radar: { image_url: 'https://example.test/radar.gif' },
  } };
  const hass = { states: {}, locale: { language: 'de' } };
  for (const view of generateDashboard(config, hass).views) {
    const cards = view.cards[0].cards;
    const popups = cards.filter(c => c.card_type === 'pop-up');
    assert.deepEqual(popups.map(c => c.hash), [warningHash, radarHash]);
    assert.ok(popups.every(c => Array.isArray(c.cards) && c.type === 'custom:bubble-card'));
  }
  assert.equal(generateDashboard({}, hass).views[0].cards[0].cards.some(c => c.card_type === 'pop-up'), false);
  assert.throws(() => normalizeConfig({ weather_alerts: { entity: 'sensor.test', radar: { image_url: 'javascript:bad' } } }), /HTTPS/);
});

test('highest warnings come first, expiry is respected, and unavailable is not all-clear', () => {
  const now = Date.parse('2026-10-17T12:00:00Z');
  const state = { state: '3', attributes: { warnings: [
    { title: 'Low', level: 1 }, { title: 'Expired', level: 4, end: '2026-10-17T11:00:00Z' }, { title: 'Severe', level: 3 },
  ] } };
  assert.deepEqual(alertSnapshot(state, now).warnings.map(w => w.title), ['Severe', 'Low']);
  assert.equal(alertSnapshot(undefined).available, false);
  assert.equal(alertSnapshot({ state: 'unavailable' }).available, false);
  assert.equal(alertSnapshot({ state: '0' }).available, true);
});

test('Klima exposes the configured forecast and warning access even without indoor sensors', () => {
  const config = { weather: 'weather.test_home', weather_alerts: { entity: 'sensor.test_alerts' } };
  const climate = generateDashboard(config, { states: {}, locale: { language: 'de' } }).views.find(v => v.path === 'climate');
  const cards = climate.cards[0].cards;
  const forecast = cards.find(c => c.type === 'weather-forecast');
  assert.equal(forecast.entity, config.weather);
  assert.equal(forecast.forecast_type, 'daily');
  assert.equal(forecast.show_current, true);
  assert.equal(forecast.show_forecast, true);
  assert.equal(cards.find(c => c.mode === 'status').weather_alerts.entity, config.weather_alerts.entity);
  assert.equal(cards.some(c => c.mode === 'climate'), false);
});

test('weather source failures belong to system checks even without other monitors', () => {
  const weather_alerts = { entity: 'sensor.test_alerts' };
  const dashboard = generateDashboard({ weather_alerts }, { states: {} });
  for (const path of ['home', 'system']) {
    const card = dashboard.views.find(v => v.path === path).cards[0].cards.find(c => c.mode === 'warnings');
    assert.deepEqual(card.weather_alerts, weather_alerts);
    assert.equal(Boolean(card.compact), path === 'home');
  }
  assert.ok(dashboard.views[0].cards[0].navigation.some(n => n.path === 'system'));
  assert.equal(weatherSystemWarning(undefined, undefined, 'de'), null);
  assert.equal(weatherSystemWarning(weather_alerts, { state: '2', attributes: { warnings: [{ title: 'Frost', level: 1 }] } }, 'de'), null, 'Real alerts are not system failures');
  for (const [state, detail] of [[undefined, 'Entity nicht gefunden'], [{ state: 'unknown' }, 'Zustand unbekannt'], [{ state: 'unavailable' }, 'In Home Assistant nicht verfügbar']]) {
    assert.equal(weatherSystemWarning(weather_alerts, state, 'de').detail, detail);
  }
  const state = { state: '0', attributes: { problems: ['NINA offline', 'NINA offline', 'DWD offline'] } };
  assert.deepEqual(weatherSystemWarning(weather_alerts, state, 'en'), { entity: weather_alerts.entity, name: 'NINA & DWD', detail: 'NINA offline · DWD offline' });
  assert.deepEqual(alertSnapshot({ state: '0', attributes: { problems: 'invalid' } }).problems, []);
});

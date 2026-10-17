import test from 'node:test';
import assert from 'node:assert/strict';
import { alertSnapshot, warningHash, radarHash } from '../src/core/weather-alerts.js';
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, collectEntities } from '../src/core/config.js';
import { translations } from '../src/core/i18n.js';
import { cleaningPageText, saugfriedMood } from '../src/core/cleaning-theme.js';
import { generateDashboard } from '../src/strategy.js';

test('Flusenfels is optional and its metadata never becomes an entity', () => {
  assert.equal(cleaningPageText({}, 'de'), translations.de);
  const config = normalizeConfig({ cleaning: { entity: 'vacuum.robot', theme: 'flusenfels' } });
  assert.deepEqual(collectEntities(config), ['vacuum.robot']);
  assert.throws(() => normalizeConfig({ cleaning: { theme: 'castle' } }), /cleaning.theme/);
});

test('Flusenfels title and theme affect only the cleaning view, preserving Home and navigation', () => {
  const config = { cleaning: { entity: 'vacuum.robot' }, rooms: [{ id: 'living', name: 'Living', temperature: 'sensor.temperature' }] };
  const standard = generateDashboard(config, { states: {} });
  const themed = generateDashboard({ ...config, cleaning: { ...config.cleaning, theme: 'flusenfels' } }, { states: {} });
  for (const view of themed.views) {
    const shell = view.cards[0];
    const original = standard.views.find(item => item.path === view.path).cards[0];
    if (view.path === 'cleaning') {
      assert.equal(shell.cleaning_theme, 'flusenfels');
      assert.equal(shell.view_title, 'Saugfried’s court');
    } else {
      assert.equal(shell.cleaning_theme, undefined);
      assert.equal(shell.view_title, original.view_title);
      assert.deepEqual(shell.appearance, original.appearance);
    }
    assert.deepEqual(shell.navigation, original.navigation);
  }
  assert.equal(translations.de.vacuum, 'Saugen');
  assert.match(cleaningPageText({ theme: 'flusenfels' }, 'de').vacuum, /Flusenjagd.*Saugen/);
});

test('Saugfried poses follow reported robot state and never pretend an offline robot is idle', () => {
  for (const state of [undefined, { state: 'unknown' }, { state: 'unavailable' }]) assert.equal(saugfriedMood(state).message, 'offline');
  assert.equal(saugfriedMood({ state: 'cleaning' }).art, 'campaign');
  assert.equal(saugfriedMood({ state: 'docked' }).art, 'resting');
  assert.equal(saugfriedMood({ state: 'paused' }).message, 'paused');
  assert.equal(saugfriedMood({ state: 'returning' }).art, 'riding');
  assert.equal(saugfriedMood({ state: 'error' }).message, 'trouble');
});

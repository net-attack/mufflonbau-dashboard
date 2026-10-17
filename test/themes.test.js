import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/core/config.js';
import { generateDashboard } from '../src/strategy.js';
import { themeProperties } from '../src/design/tokens.js';
test('storybook is the default theme', () => {
  assert.equal(normalizeConfig({}).appearance.theme, 'storybook');
  assert.equal(generateDashboard({}, { states: {} }).views[0].cards[0].appearance.theme, 'storybook');
});
for (const theme of ['calm', 'atmospheric', 'storybook']) {
  test(`${theme} propagates to the shell and live cards without changing entity bindings`, () => {
    const appearance = { theme, mode: 'night' };
    const dashboard = generateDashboard({ appearance, rooms: [{ id: 'living', name: 'Living room', lights: ['light.living'] }] }, { states: {} });
    for (const view of dashboard.views) {
      const shell = view.cards[0];
      assert.deepEqual(shell.appearance, appearance);
      for (const card of shell.cards.filter(card => card.type === 'custom:mufflonbau-live')) assert.deepEqual(card.appearance, appearance);
    }
    const modes = ['ambient', 'night'].map(mode => themeProperties(mode, theme));
    for (const properties of modes) {
      assert.equal(properties['--ha-card-background'], properties['--mb-surface']);
      assert.equal(properties['--primary-text-color'], properties['--mb-ink']);
      assert.ok(!/https?:/.test(properties['--mb-wallpaper']), 'Bundled themes must not request remote imagery');
    }
    assert.notEqual(modes[0]['--mb-surface'], modes[1]['--mb-surface']);
  });
}
test('rejects unknown theme names with an actionable configuration error', () => {
  for (const appearance of [null, 'storybook', []]) {
    assert.throws(() => normalizeConfig({ appearance }), /appearance must be an object/);
  }
  assert.throws(() => normalizeConfig({ appearance: { theme: 'unknown' } }), /appearance.theme must be/);
});

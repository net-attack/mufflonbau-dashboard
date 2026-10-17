import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.HTMLElement = class {};
globalThis.window = {};
const registry = new Map();
globalThis.customElements = { get: name => registry.get(name), define: (name, value) => registry.set(name, value) };
await import('../mufflonbau-dashboard.js');
const Strategy = registry.get('ll-strategy-dashboard-mufflonbau');
const homeShell = result => result.views[0].cards[0];
test('generates a full-width shell and usable empty dashboard', async () => {
  const result = await Strategy.generate({}, { states: {} });
  assert.equal(result.title, 'Mufflonbau');
  assert.equal(result.views[0].path, 'home');
  assert.equal(result.views[0].type, 'panel');
  assert.equal(homeShell(result).type, 'custom:mufflonbau-shell');
  assert.match(homeShell(result).cards.find(card => card.mode === 'message').content, /No available/);
});
test('keeps missing favorites visible so live states can recover without rebuilding', async () => {
  const result = await Strategy.generate({ title: 'My Home', entities: ['light.room', 'sensor.missing'] }, { states: { 'light.room': { state: 'unavailable' } } });
  assert.equal(result.title, 'My Home');
  assert.deepEqual(homeShell(result).cards.find(card => card.mode === 'devices').entities, ['light.room', 'sensor.missing']);
});
test('rejects malformed entity configuration', async () => {
  await assert.rejects(Strategy.generate({ entities: 'light.room' }, { states: {} }), /must be an array/);
});
for (const [language, home] of [['en', 'Home'], ['de', 'Zuhause']]) {
  test(`propagates explicit ${language} to all shell and live cards`, async () => {
    const result = await Strategy.generate({ language, entities: ['light.room'] }, { locale: { language: language === 'de' ? 'en' : 'de' }, states: {} });
    assert.equal(result.views[0].title, home);
    for (const view of result.views) {
      assert.equal(view.cards[0].language, language);
      assert.ok(view.cards[0].cards.filter(card => card.type === 'custom:mufflonbau-live').every(card => card.language === language));
    }
  });
}
test('uses the HA profile language and regional variants', async () => {
  for (const profile of [{ locale: { language: 'de-DE' } }, { language: 'de' }]) {
    const result = await Strategy.generate({}, { ...profile, states: {} });
    assert.equal(homeShell(result).language, 'de');
  }
});
test('unsupported profile language falls back to English', async () => {
  const result = await Strategy.generate({}, { locale: { language: 'fr' }, states: {} });
  assert.equal(homeShell(result).language, 'en');
});
test('rejects unsupported explicit languages', async () => {
  await assert.rejects(Strategy.generate({ language: 'fr' }, { states: {} }), /language must be/);
});

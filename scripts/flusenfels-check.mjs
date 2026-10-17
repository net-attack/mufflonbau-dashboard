import assert from 'node:assert/strict';
import { previewConfig, previewHass } from './preview-fixture.mjs';

export async function checkFlusenfels(sourcePage) {
  const context = await sourcePage.context().browser().newContext({ viewport: { width: 1340, height: 900 }, reducedMotion: 'reduce', hasTouch: true });
  try {
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('/dashboard-test/cleaning', sourcePage.url()).href);
    await page.addScriptTag({ url: '/bundle.js' });
    await page.evaluate(async ({ config, hass }) => {
      document.body.style.margin = '0'; document.querySelector('main').style.cssText = 'max-width:none;margin:0';
      window.courtCalls = [];
      window.courtHass = { ...hass, callService: async (...args) => window.courtCalls.push(args) };
      window.courtConfig = { ...config, cleaning: { ...config.cleaning, theme: 'flusenfels' } };
      window.loadCardHelpers = async () => ({ createCardElement: () => {
        const card = document.createElement('div');
        card.style.cssText = 'height:100%;display:grid;place-items:center;min-height:180px;background:var(--mb-soft);color:var(--mb-muted)';
        card.textContent = 'Reinigungskarte · native HA-Karte im Test ersetzt'; return card;
      } });
      const shell = document.createElement('mufflonbau-shell'); shell.id = 'court-dashboard'; document.querySelector('main').replaceChildren(shell);
      window.showCourt = async (path, appearance = { theme: 'storybook', mode: 'ambient' }) => {
        const dashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate({ ...window.courtConfig, appearance }, window.courtHass);
        history.replaceState(null, '', `/dashboard-test/${path}`);
        shell.setConfig(dashboard.views.find(view => view.path === path).cards[0]); shell.hass = window.courtHass; scrollTo(0, 0);
      };
      await window.showCourt('cleaning');
    }, { config: previewConfig, hass: previewHass });
    const shell = page.locator('#court-dashboard'); const card = shell.locator('mufflonbau-cleaning');
    await card.locator('.flusenfels').waitFor();
    assert.match(await card.locator('h2').innerText(), /Saugfried.*Fürst von Flusenfels/);
    assert.equal(await shell.locator('.royal-map-title').innerText(), 'Die Karte des Reiches');
    assert.equal(await shell.getAttribute('data-cleaning-theme'), 'flusenfels');
    assert.ok(await shell.locator('.saugfried-art img').evaluateAll(async images => {
      await Promise.all(images.map(img => img.decode()));
      return images.length >= 6 && images.every(img => img.naturalWidth > 0 && img.src.startsWith('data:image/png;base64,'))
        && images.some(img => img.closest('.wordmark') && img.naturalWidth === 2172)
        && images.filter(img => !img.closest('.wordmark')).every(img => img.naturalWidth === 1448);
    }), 'Original artwork must decode from the shipped bundle without external files');
    for (const theme of ['storybook', 'atmospheric', 'calm']) {
      for (const mode of ['ambient', 'night']) {
        await page.evaluate(({ theme, mode }) => window.showCourt('cleaning', { theme, mode }), { theme, mode });
        await card.locator('.portrait img').waitFor();
        assert.equal(await card.locator('.portrait').getAttribute('data-pose'), 'resting');
        const colors = await shell.evaluate(shell => {
          const card = shell.shadowRoot.querySelector('mufflonbau-cleaning');
          return ['--mb-canvas', '--mb-ink', '--mb-accent'].map(key => [getComputedStyle(shell).getPropertyValue(key), getComputedStyle(card).getPropertyValue(key)]);
        });
        assert.ok(colors.every(([shell, card]) => shell === card), 'Court palette must match the cleaning card');
        await page.screenshot({ path: `test-results/flusenfels-${theme}-${mode}.png` });
      }
    }
    for (const [state, pose] of [['cleaning', 'campaign'], ['returning', 'riding'], ['paused', 'resting'], ['error', 'puzzled'], ['unavailable', 'puzzled']]) {
      await page.evaluate(state => {
        window.courtHass = { ...window.courtHass, states: { ...window.courtHass.states,
          'vacuum.robot': { state, attributes: { cleaning_mode: 'Mopping', cleangenius: 'Off' } },
        } }; document.querySelector('#court-dashboard').hass = window.courtHass;
      }, state);
      assert.equal(await card.locator('.portrait').getAttribute('data-pose'), pose);
      if (state === 'cleaning' || state === 'paused') assert.equal(await card.locator('.running-mode strong').innerText(), 'Wischen');
      if (state === 'unavailable') {
        assert.match(await card.locator('.royal-status').innerText(), /nicht verfügbar/);
        assert.equal(await card.locator('[data-command=start_pause]').isDisabled(), true);
      }
      if (state === 'error') assert.match(await card.locator('.royal-status').innerText(), /Fehler/);
    }
    await page.evaluate(() => {
      window.courtHass = { ...window.courtHass, states: { ...window.courtHass.states,
        'vacuum.robot': { state: 'docked', attributes: {} },
      } }; document.querySelector('#court-dashboard').hass = window.courtHass;
    });
    await card.locator('[data-mode=clean_genius]').click();
    assert.equal(await page.evaluate(() => window.courtCalls.length), 0);
    await card.locator('[data-room=living]').click();
    assert.deepEqual(await page.evaluate(() => window.courtCalls.at(-1)), ['script', 'turn_on', {}, { entity_id: 'script.clean_genius_living' }]);
    await shell.locator('.camera-toolbar button[aria-label=Vergrößern]').click();
    assert.match(await shell.locator('.camera-content').getAttribute('style'), /scale\(1\.5\)/);
    for (const size of [{ width: 893, height: 533 }, { width: 533, height: 893 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      await page.evaluate(() => window.showCourt('cleaning'));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Court must fit tablet and phone widths');
      assert.ok(await card.locator('.rooms .room').evaluateAll(rooms => rooms.every(room => {
        const r = room.getBoundingClientRect(); const p = room.closest('.panel').getBoundingClientRect();
        return r.height >= 44 && r.left >= p.left && r.right <= p.right && r.bottom <= p.bottom;
      })), 'Chamber controls must stay inside the panel with usable touch targets');
      await page.screenshot({ path: `test-results/flusenfels-${size.width}.png`, fullPage: true });
      await page.evaluate(() => scrollTo(0, document.scrollingElement.scrollHeight));
      const end = await shell.evaluate(shell => ({ map: shell.shadowRoot.querySelector('.cleaning-map').getBoundingClientRect().bottom,
        nav: shell.shadowRoot.querySelector('nav').getBoundingClientRect().top }));
      assert.ok(end.map <= end.nav - 8, 'The last map controls must remain reachable above the dock');
    }
    for (const path of ['home', 'rooms', 'climate', 'presence', 'system', 'admin']) {
      await page.evaluate(path => window.showCourt(path), path);
      assert.equal(await shell.getAttribute('data-cleaning-theme'), null);
      assert.equal(await shell.locator('.saugfried-art').count(), 0, `${path}: medieval artwork belongs only on Cleaning`);
      assert.equal(await shell.evaluate(shell => getComputedStyle(shell).getPropertyValue('--mb-canvas').trim()), '#eee9dc', `${path}: restore the normal theme`);
    }
    assert.deepEqual(errors, []);
    console.log('Flusenfels: bundled original artwork, live poses and cleaning type, exact room actions, map zoom, page-only palette, and responsive layouts passed.');
  } finally { await context.close(); }
}

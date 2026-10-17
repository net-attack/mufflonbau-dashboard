import assert from 'node:assert/strict';

export async function checkUnified(sourcePage, config, hass) {
  const context = await sourcePage.context().browser().newContext({ viewport: { width: 893, height: 533 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('/dashboard-mufflonbau/home', sourcePage.url()).href);
    await page.addScriptTag({ url: '/bundle.js' });
    await page.evaluate(async ({ config, hass }) => {
      document.body.style.margin = '0';
      document.querySelector('main').style.cssText = 'max-width:none;margin:0';
      window.unifiedHass = { ...hass, callService: async () => {} };
      window.unifiedConfig = config;
      window.unifiedDashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate(config, window.unifiedHass);
      const shell = document.createElement('mufflonbau-shell'); shell.id = 'unified-dashboard';
      document.querySelector('main').replaceChildren(shell);
      window.unifiedShow = path => {
        history.replaceState(null, '', `/dashboard-mufflonbau/${path}`);
        shell.setConfig(window.unifiedDashboard.views.find(view => view.path === path).cards[0]); shell.hass = window.unifiedHass;
      };
      window.addEventListener('location-changed', () => window.unifiedShow(location.pathname.split('/').at(-1)));
      window.unifiedShow('home');
    }, { config, hass });
    const shell = page.locator('#unified-dashboard');
    assert.equal(await shell.locator('.mode-ventilation').count(), 1);
    assert.equal(await shell.locator('mufflonbau-laundry').count(), 1);
    assert.equal(await shell.locator('mufflonbau-shopping').count(), 1);
    for (const viewport of [{ width: 1340, height: 800 }, { width: 893, height: 533 }, { width: 533, height: 893 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const geometry = await shell.evaluate(element => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        slots: [...element.shadowRoot.querySelectorAll('.slot')].map(slot => {
          const rect = slot.getBoundingClientRect();
          return { name: slot.className, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        }),
      }));
      assert.ok(geometry.overflow <= 1, 'Combined home has no horizontal overflow');
      const summaries = geometry.slots.filter(slot => /mode-(room-summary|presence-summary|cleaning|warnings|ventilation)|\blaundry\b/.test(slot.name));
      assert.equal(summaries.length, 6, 'All six status tiles must be covered by the width check');
      const widths = summaries.map(slot => slot.right - slot.left);
      assert.ok(Math.max(...widths) - Math.min(...widths) <= 1, `${viewport.width}px: home status tiles must all have equal widths: ${JSON.stringify(widths)}`);
      const heights = summaries.map(slot => slot.bottom - slot.top);
      assert.ok(Math.max(...heights) - Math.min(...heights) <= 1, `${viewport.width}px: home status tiles must all have equal heights: ${JSON.stringify(heights)}`);
      for (let i = 0; i < geometry.slots.length; i++) for (const other of geometry.slots.slice(i + 1)) {
        const slot = geometry.slots[i];
        const overlap = Math.min(slot.right, other.right) - Math.max(slot.left, other.left) > 1 && Math.min(slot.bottom, other.bottom) - Math.max(slot.top, other.top) > 1;
        assert.equal(overlap, false, `${viewport.width}px: ${slot.name} overlaps ${other.name}`);
      }
      const shopping = shell.locator('mufflonbau-shopping'); await shopping.scrollIntoViewIfNeeded();
      const bounds = await shopping.boundingBox();
      assert.ok(bounds.width > 44 && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const input = await shopping.locator('input').boundingBox();
      const button = await shopping.locator('button').boundingBox();
      const navigation = await shell.locator('nav').boundingBox();
      assert.ok(input.y + input.height < navigation.y && button.y + button.height < navigation.y, 'Shopping entry must remain accessible above fixed navigation after scrolling');
    }
    await page.screenshot({ path: 'test-results/unified-home.png', fullPage: true });
    await shell.locator('mufflonbau-shopping a').tap();
    assert.match(page.url(), /\/dashboard-mufflonbau\/shopping$/);
    await shell.locator('.back-link').tap();
    await shell.locator('.mode-ventilation a').tap();
    assert.match(page.url(), /\/dashboard-mufflonbau\/ventilation$/);
    await shell.locator('.back-link').tap();
    await shell.locator('mufflonbau-laundry .open').tap();
    assert.equal(await shell.locator('mufflonbau-laundry dialog').evaluate(dialog => dialog.open), true);
    await shell.locator('mufflonbau-laundry .close').tap();
    await shell.locator('.mode-cleaning a').tap();
    assert.match(page.url(), /\/dashboard-mufflonbau\/cleaning$/);
    assert.equal(await shell.locator('mufflonbau-maintenance').count(), 1);
    await page.evaluate(async () => {
      window.loadCardHelpers = async () => ({ createCardElement: config => {
        const card = document.createElement('div'); card.testConfig = config;
        if (config.card_type === 'pop-up') card.style.display = 'none';
        else { card.textContent = config.name ?? config.type; card.style.minHeight = '100px'; }
        return card;
      } });
      window.unifiedHass = { ...window.unifiedHass, states: { ...window.unifiedHass.states,
        'sensor.test_weather_alerts': { state: '0', attributes: { warnings: [], problems: [] } },
      } };
      window.unifiedDashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate({
        ...window.unifiedConfig, weather_alerts: { entity: 'sensor.test_weather_alerts', radar: { image_url: 'https://example.test/radar.gif' } },
      }, window.unifiedHass);
      window.unifiedShow('climate');
    });
    await page.waitForFunction(() => document.querySelector('#unified-dashboard')._children.some(card => card.testConfig?.type === 'weather-forecast'));
    assert.match((await shell.locator('.mode-status button').allTextContents()).join(' '), /NINA & DWD.*Keine aktiven Warnungen/s);
    assert.match((await shell.locator('.mode-status button').allTextContents()).join(' '), /Regenradar/);
    for (const viewport of [{ width: 893, height: 533 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.ok(await shell.locator('.mode-status button').evaluateAll(buttons => buttons.length === 2
        && buttons.every(button => button.getBoundingClientRect().width >= 44 && button.getBoundingClientRect().height >= 44)));
    }
    await page.screenshot({ path: 'test-results/unified-climate-weather.png', fullPage: true });
    await page.evaluate(() => window.unifiedShow('home'));
    await page.waitForFunction(() => document.querySelector('#unified-dashboard')._children.some(card => card._config?.mode === 'header'));
    assert.equal(await shell.locator('mufflonbau-weather-alerts .warning').count(), 0);
    assert.match(await shell.locator('mufflonbau-weather-alerts button').first().innerText(), /Regenradar/);
    assert.equal(await shell.locator('mufflonbau-shopping').count(), 1);
    assert.equal(await shell.locator('mufflonbau-laundry').count(), 1);
    assert.deepEqual(errors, []);
    console.log('Unified board: ventilation, laundry, shopping, maintenance, shared navigation and non-overlapping touch layouts passed.');
  } finally { await context.close(); }
}

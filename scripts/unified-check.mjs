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
    assert.deepEqual(errors, []);
    console.log('Unified board: ventilation, laundry, shopping, maintenance, shared navigation and non-overlapping touch layouts passed.');
  } finally { await context.close(); }
}

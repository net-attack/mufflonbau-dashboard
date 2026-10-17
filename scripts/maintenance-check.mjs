import assert from 'node:assert/strict';
import { previewConfig, previewHass } from './preview-fixture.mjs';

export async function checkMaintenance(sourcePage) {
  const context = await sourcePage.context().browser().newContext({ viewport: { width: 1340, height: 800 }, hasTouch: true, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('/dashboard-test/cleaning', sourcePage.url()).href); await page.addScriptTag({ url: '/bundle.js' });
    await page.evaluate(async ({ config, hass }) => {
      document.body.style.margin = '0'; document.querySelector('main').style.cssText = 'max-width:none;margin:0';
      window.maintenanceCalls = []; window.maintenanceDetails = [];
      document.addEventListener('hass-more-info', event => window.maintenanceDetails.push(event.detail.entityId));
      const extras = ['Seitenbürste', 'Sensoren reinigen', 'Räder reinigen', 'Kalkschutz', 'Silberionen'].map((name, index) => ({ name, percent: `sensor.part_${index}`, remaining: `sensor.part_time_${index}` }));
      window.maintenanceConfig = { ...config, cleaning: { ...config.cleaning, theme: 'flusenfels', maintenance: [...config.cleaning.maintenance, ...extras] } };
      window.maintenanceHass = { ...hass, callService: async (...args) => window.maintenanceCalls.push(args), states: { ...hass.states,
        ...Object.fromEntries(extras.flatMap((item, index) => [
          [item.percent, { state: String(20 + index * 10), attributes: { unit_of_measurement: '%' } }],
          [item.remaining, { state: '3', attributes: { unit_of_measurement: index < 2 ? 'h' : 'd' } }],
        ])),
      } };
      window.loadCardHelpers = async () => ({ createCardElement: () => { const card = document.createElement('div'); card.textContent = 'Native map placeholder'; return card; } });
      const shell = document.createElement('mufflonbau-shell'); shell.id = 'maintenance-shell'; document.querySelector('main').replaceChildren(shell);
      window.showMaintenance = async mode => {
        const dashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate({ ...window.maintenanceConfig, appearance: { mode } }, window.maintenanceHass);
        shell.setConfig(dashboard.views.find(view => view.path === 'cleaning').cards[0]); shell.hass = window.maintenanceHass;
      };
      await window.showMaintenance('ambient');
    }, { config: previewConfig, hass: previewHass });
    const shell = page.locator('#maintenance-shell'); const workshop = shell.locator('mufflonbau-maintenance');
    await workshop.locator('.item').first().waitFor();
    assert.equal(await workshop.locator('.item').count(), 7);
    assert.match(await workshop.locator('h2').innerText(), /Saugfrieds Wartungsstube/);
    assert.match(await workshop.locator('.summary').innerText(), /Wartung im Blick behalten: Filter/);
    assert.equal(await workshop.locator('.item').first().getAttribute('data-status'), 'soon');
    assert.match(await workshop.locator('.workshop').innerText(), /3 d/);
    await workshop.locator('[data-entity="sensor.robot_filter_time"]').click();
    assert.deepEqual(await page.evaluate(() => window.maintenanceDetails), ['sensor.robot_filter_time']);
    await page.evaluate(() => {
      window.maintenanceHass = { ...window.maintenanceHass, states: { ...window.maintenanceHass.states,
        'sensor.robot_filter_left': { state: '0', attributes: { unit_of_measurement: '%' } },
        'sensor.part_0': { state: 'unavailable', attributes: { unit_of_measurement: '%' } },
      } }; document.querySelector('#maintenance-shell').hass = window.maintenanceHass;
    });
    assert.equal(await workshop.locator('.item').first().getAttribute('data-status'), 'due');
    assert.match(await workshop.locator('.summary').innerText(), /Wartungsdaten prüfen: Seitenbürste/);
    assert.match(await workshop.locator('.workshop').innerText(), /In Home Assistant nicht verfügbar/);
    assert.equal(await workshop.locator('.item[data-status=unknown] progress').count(), 0);
    for (const viewport of [{ width: 1340, height: 800 }, { width: 800, height: 1340 }, { width: 893, height: 533 }, { width: 533, height: 893 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      for (const mode of ['ambient', 'night']) {
        await page.evaluate(mode => window.showMaintenance(mode), mode);
        await workshop.locator('.item').first().waitFor();
        assert.ok(await workshop.locator('.reading').evaluateAll(buttons => buttons.every(button => {
          const r = button.getBoundingClientRect(); return r.width >= 44 && r.height >= 44;
        })), 'Sensor detail buttons must offer tablet touch targets');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Maintenance must fit tablet and phone widths');
        assert.equal(await shell.evaluate(shell => {
          const child = shell.shadowRoot.querySelector('mufflonbau-maintenance');
          return getComputedStyle(child).getPropertyValue('--mb-surface') === getComputedStyle(shell).getPropertyValue('--mb-surface');
        }), true, 'Maintenance shares the court palette');
        await page.evaluate(() => scrollTo(0, document.scrollingElement.scrollHeight));
        const end = await shell.evaluate(shell => ({ card: shell.shadowRoot.querySelector('mufflonbau-maintenance').getBoundingClientRect().bottom,
          nav: shell.shadowRoot.querySelector('nav').getBoundingClientRect().top }));
        assert.ok(end.card <= end.nav - 8, 'All seven maintenance items must be reachable above the dock');
        await page.screenshot({ path: `test-results/maintenance-${viewport.width}-${mode}.png`, fullPage: true });
      }
    }
    await page.evaluate(async () => { window.maintenanceConfig.language = 'en'; await window.showMaintenance('night'); });
    assert.match(await workshop.locator('h2').innerText(), /Saugfried’s maintenance workshop/);
    assert.match(await workshop.locator('.summary').innerText(), /Check maintenance data/);
    assert.equal(await workshop.locator('.item').first().locator('.badge').innerText(), 'Due');
    assert.deepEqual(await page.evaluate(() => window.maintenanceCalls), [], 'Reading maintenance must never call services or reset counters');
    assert.deepEqual(errors, []);
    console.log('Maintenance: seven items, real units, live updates, unknown values, sensor details, court palette and tablet layouts passed.');
  } finally { await context.close(); }
}

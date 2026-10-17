// Browser verification shared by local npm run ci and GitHub Actions.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { load, YAML11_SCHEMA } from 'js-yaml';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
const samples = [];
for (const file of await readdir(new URL('../examples/', import.meta.url))) {
  if (!file.endsWith('.yaml')) continue;
  const parsed = load(await readFile(new URL(`../examples/${file}`, import.meta.url), 'utf8'), { schema: YAML11_SCHEMA });
  samples.push(parsed.strategy ?? parsed);
}
const bundle = await readFile(new URL('../mufflonbau-dashboard.js', import.meta.url));
const server = createServer((request, response) => {
  response.setHeader('Content-Type', request.url === '/bundle.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/bundle.js' ? bundle : '<!doctype html><html lang="en"><style>body{margin:16px;font-family:system-ui}main{display:grid;gap:16px;max-width:1000px;margin:auto}ha-card{display:block}</style><main></main></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/dashboard-test/home`);
  await page.addScriptTag({ url: '/bundle.js' });
  await page.evaluate(async () => {
    const states = {
      'sensor.temperature': { state: '21.5', attributes: { unit_of_measurement: '°C' } },
      'sensor.humidity': { state: '45', attributes: { unit_of_measurement: '%' } },
      'sensor.battery': { state: '10', attributes: {} }, 'light.room': { state: 'on', attributes: {} },
    };
    const room = { id: 'living', name: { en: 'Living room', de: 'Wohnzimmer' }, temperature: 'sensor.temperature', humidity: 'sensor.humidity', lights: ['light.room'] };
    window.sampleHass = { states, locale: { language: 'de' }, config: { time_zone: 'Europe/Berlin' }, themes: { darkMode: false } };
    const configs = [
      { mode: 'header', title: 'Mufflonbau' },
      { mode: 'climate', rooms: [room] },
      { mode: 'warnings', monitors: [{ entity: 'sensor.battery', battery_below: 20 }] },
      { mode: 'floorplan', rooms: [room] },
    ];
    for (const config of configs) {
      const card = document.createElement('mufflonbau-live');
      card.id = config.mode;
      card.setConfig({ type: 'custom:mufflonbau-live', language: 'auto', ...config });
      card.hass = window.sampleHass;
      document.querySelector('main').append(card);
    }
    window.moreInfo = [];
    document.addEventListener('hass-more-info', event => window.moreInfo.push(event.detail.entityId));
    const result = await customElements.get('ll-strategy-dashboard-mufflonbau').generate({ rooms: [room] }, window.sampleHass);
    if (result.views.some(view => !view.type)) throw new Error('Generated view type is missing');
  });
  assert.match(await page.locator('#climate ha-card').innerText(), /Wohnzimmer/);
  assert.match(await page.locator('#climate ha-card').innerText(), /21,5/);
  assert.match(await page.locator('#warnings ha-card').innerText(), /Batterie: 10%/);
  await page.locator('#climate button').click();
  assert.deepEqual(await page.evaluate(() => window.moreInfo), ['sensor.temperature']);
  await page.evaluate(() => {
    window.sampleHass = { ...window.sampleHass, states: { ...window.sampleHass.states,
      'sensor.temperature': { state: 'unavailable', attributes: {} },
      'sensor.battery': { state: '80', attributes: {} }, 'light.room': { state: 'off', attributes: {} } } };
    document.querySelectorAll('mufflonbau-live').forEach(card => { card.hass = window.sampleHass; });
  });
  assert.match(await page.locator('#climate ha-card').innerText(), /Offline/);
  assert.match(await page.locator('#warnings ha-card').innerText(), /in Ordnung/);
  assert.equal(await page.locator('#floorplan rect.lit').count(), 0);
  assert.equal(await page.locator('#floorplan rect.offline').count(), 1);
  await page.locator('#floorplan a').click();
  assert.match(page.url(), /\/dashboard-test\/room-living$/);
  await page.evaluate(() => {
    window.sampleHass = { ...window.sampleHass, locale: { language: 'en' }, themes: { darkMode: true } };
    document.querySelectorAll('mufflonbau-live').forEach(card => { card.hass = window.sampleHass; });
  });
  assert.match(await page.locator('#climate ha-card').innerText(), /Living room/);
  assert.equal(await page.locator('ha-card.night').count(), 4);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/mufflonbau-mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.evaluate(() => {
    const card = document.querySelector('#climate');
    card.setConfig({ mode: 'climate', rooms: [{ id: 'safe', name: '<img src=x onerror=alert(1)>' }] });
    const header = document.querySelector('#header');
    if (!header._timer) throw new Error('Header clock not started');
    header.remove();
    if (header._timer) throw new Error('Header clock leaked');
  });
  assert.equal(await page.locator('#climate img').count(), 0);
  assert.match(await page.locator('#climate ha-card').innerText(), /<img/);
  // Exercise the actual YAML examples through the shipped bundle and render all
  // custom live modes. Native HA cards are validated structurally, not simulated.
  await page.evaluate(async samples => {
    const Strategy = customElements.get('ll-strategy-dashboard-mufflonbau');
    for (const config of samples) {
      const dashboard = await Strategy.generate(config, window.sampleHass);
      document.querySelector('main').replaceChildren();
      for (const view of dashboard.views) {
        if (!view.type) throw new Error('Missing view type');
        for (const cardConfig of view.cards) {
          if (!cardConfig.type) throw new Error('Missing card type');
          if (cardConfig.type !== 'custom:mufflonbau-live') continue;
          const card = document.createElement('mufflonbau-live');
          card.setConfig(cardConfig);
          card.hass = window.sampleHass;
          document.querySelector('main').append(card);
          if (!card.shadowRoot.querySelector('ha-card')) throw new Error('Live card failed to render');
          for (const rect of card.shadowRoot.querySelectorAll('svg rect')) {
            for (const key of ['x', 'y', 'width', 'height']) {
              if (!rect.hasAttribute(key) || !Number.isFinite(Number(rect.getAttribute(key)))) throw new Error(`Invalid floorplan ${key}`);
            }
          }
        }
      }
    }
  }, samples);
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: rendering, live updates, localization, warnings, navigation, mobile layout, safe labels, clock cleanup, and actual YAML examples.');
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) await page.screenshot({ path: 'test-results/failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

// Browser verification shared by local npm run ci and GitHub Actions.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { previewConfig, previewHass } from './preview-fixture.mjs';
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
  response.setHeader('Content-Type', request.url === '/bundle.js' ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8');
  response.end(request.url === '/bundle.js' ? bundle : '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:16px;font-family:system-ui}main{display:grid;gap:16px;max-width:1000px;margin:auto}ha-card{display:block}</style><main></main></html>');
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
  await page.locator('#climate .climate-button').click();
  assert.deepEqual(await page.evaluate(() => window.moreInfo), ['sensor.temperature']);
  await page.evaluate(() => {
    window.sampleHass = { ...window.sampleHass, states: { ...window.sampleHass.states,
      'sensor.temperature': { state: 'unavailable', attributes: {} },
      'sensor.battery': { state: '80', attributes: {} }, 'light.room': { state: 'off', attributes: {} } } };
    document.querySelectorAll('mufflonbau-live').forEach(card => { card.hass = window.sampleHass; });
  });
  assert.equal(await page.locator('#climate svg[role=img][aria-label="In Home Assistant nicht verfügbar"]').count(), 1);
  assert.match(await page.locator('#warnings ha-card').innerText(), /in Ordnung/);
  assert.equal(await page.locator('#floorplan polygon.lit').count(), 0);
  assert.equal(await page.locator('#floorplan polygon.offline').count(), 1);
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
  await page.evaluate(() => {
    window.diagnosticCalls = [];
    window.diagnosticHass = { ...window.sampleHass, callService: async (...args) => window.diagnosticCalls.push(args), states: {
      'light.nanoleaf': { state: 'off', attributes: { friendly_name: 'Panel' } },
      'light.unknown': { state: 'unknown', attributes: {} },
      'light.unavailable': { state: 'unavailable', attributes: {} },
    } };
    const card = document.createElement('mufflonbau-live'); card.id = 'diagnostics';
    card.setConfig({ mode: 'devices', language: 'de', entities: ['light.nanoleaf', 'light.unknown', 'light.unavailable', 'light.missing'] });
    card.hass = window.diagnosticHass; document.querySelector('main').append(card);
  });
  const diagnostics = page.locator('#diagnostics');
  assert.match(await diagnostics.locator('ha-card').innerText(), /Entity nicht gefunden/);
  assert.match(await diagnostics.locator('ha-card').innerText(), /Zustand unbekannt/);
  assert.match(await diagnostics.locator('ha-card').innerText(), /In Home Assistant nicht verfügbar/);
  assert.match(await diagnostics.locator('.entity-id').allTextContents().then(ids => ids.join(',')), /light.missing/);
  assert.equal(await diagnostics.getByRole('switch', { name: 'Panel', exact: true }).isEnabled(), true);
  await diagnostics.getByRole('switch', { name: 'Panel', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.diagnosticCalls[0]), ['homeassistant', 'toggle', {}, { entity_id: 'light.nanoleaf' }]);
  await page.evaluate(() => {
    const card = document.querySelector('#diagnostics');
    card.hass = { ...window.diagnosticHass, states: { ...window.diagnosticHass.states, 'light.nanoleaf': { state: 'on', attributes: { friendly_name: 'Panel' } }, 'light.missing': { state: 'off', attributes: { friendly_name: 'Recovered' } } } };
  });
  assert.equal(await diagnostics.getByRole('switch', { name: 'Panel', exact: true }).getAttribute('aria-checked'), 'true');
  assert.equal(await diagnostics.getByRole('switch', { name: 'Recovered', exact: true }).isEnabled(), true);
  // Render the actual YAML examples through the shipped shell. A minimal native
  // card double checks the helper boundary and inherited theme variables.
  await page.evaluate(() => {
    customElements.define('test-native-card', class extends HTMLElement {
      constructor() { super(); const root = this.attachShadow({ mode: 'open' }); const body = document.createElement('div'); body.className = 'native-surface'; body.style.cssText = 'padding:24px;border-radius:var(--ha-card-border-radius);background:var(--ha-card-background);color:var(--primary-text-color)'; body.textContent = 'Native card'; root.append(body); }
    });
    window.loadCardHelpers = async () => ({ createCardElement: () => document.createElement('test-native-card') });
  });
  for (const sample of samples) {
    await page.evaluate(async config => {
      const dashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate(config, window.sampleHass);
      document.querySelector('main').replaceChildren();
      for (const view of dashboard.views) {
        if (view.type !== 'panel') throw new Error('Expected a full-width panel');
        const shell = document.createElement('mufflonbau-shell');
        shell.setConfig(view.cards[0]); shell.hass = window.sampleHass;
        document.querySelector('main').append(shell);
      }
      await new Promise(resolve => requestAnimationFrame(resolve));
      for (const shell of document.querySelectorAll('mufflonbau-shell')) {
        if (!shell.shadowRoot.querySelector('.slot')) throw new Error('Shell did not render cards');
        for (const live of shell.shadowRoot.querySelectorAll('mufflonbau-live')) {
          if (!live.shadowRoot.querySelector('ha-card')) throw new Error('Live card failed to render');
          for (const rect of live.shadowRoot.querySelectorAll('.floor-map rect')) {
            for (const key of ['x', 'y', 'width', 'height']) {
              if (!rect.hasAttribute(key) || !Number.isFinite(Number(rect.getAttribute(key)))) throw new Error(`Invalid floorplan ${key}`);
            }
          }
        }
      }
    }, sample);
  }
  // Full dashboard previews use synthetic data only, including CI artifacts.
  await page.evaluate(async ({ config, hass }) => {
    document.body.style.margin = '0';
    const main = document.querySelector('main'); main.style.cssText = 'display:block;max-width:none;margin:0';
    window.calls = []; window.failAction = false;
    window.previewHass = { ...hass, callService: async (...args) => { if (window.failAction) throw new Error('Test failure'); window.calls.push(args); } };
    const result = await customElements.get('ll-strategy-dashboard-mufflonbau').generate(config, window.previewHass);
    window.previewDashboard = result;
    const shell = document.createElement('mufflonbau-shell'); shell.id = 'dashboard';
    shell.setConfig(result.views[0].cards[0]); shell.hass = window.previewHass; main.replaceChildren(shell);
  }, { config: previewConfig, hass: previewHass });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.screenshot({ path: 'test-results/dashboard-ambient-desktop.png', fullPage: true });
  const toggle = page.locator('#dashboard button[role=switch]').first();
  await toggle.click();
  assert.deepEqual(await page.evaluate(() => window.calls[0]), ['homeassistant', 'toggle', {}, { entity_id: 'light.living' }]);
  await page.evaluate(() => { window.failAction = true; });
  await toggle.click();
  assert.match(await page.locator('#dashboard [role=alert]').innerText(), /fehlgeschlagen/);
  await page.evaluate(() => { window.failAction = false; document.querySelector('#dashboard').hass = { ...window.previewHass, states: { ...window.previewHass.states, 'light.living': { state: 'unavailable', attributes: { friendly_name: 'Wohnzimmer' } } } }; });
  assert.equal(await page.locator('#dashboard button[role=switch]').first().isDisabled(), true);
  for (const theme of ['calm', 'atmospheric', 'storybook']) {
  for (const mode of ['ambient', 'night']) {
    await page.evaluate(({ mode, theme }) => {
      const shell = document.querySelector('#dashboard');
      shell.setConfig({ ...window.previewDashboard.views[0].cards[0], appearance: { mode, theme }, cards: window.previewDashboard.views[0].cards[0].cards.map(card => ({ ...card, appearance: { mode, theme } })) });
      shell.hass = window.previewHass;
    }, { mode, theme });
    await page.setViewportSize({ width: 1440, height: 1080 });
    const colors = await page.locator('#dashboard').evaluate(shell => [...shell.shadowRoot.querySelectorAll('mufflonbau-live')].filter(card => !['header', 'climate'].includes(card._config.mode)).map(card => getComputedStyle(card.shadowRoot.querySelector('ha-card')).backgroundColor));
    assert.equal(new Set(colors).size, 1, 'Every content card must use the same surface color');
    await page.screenshot({ path: `test-results/dashboard-${theme}-${mode}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: `test-results/dashboard-${theme}-${mode}-mobile.png`, fullPage: true });
  }
  }
  await page.locator('#dashboard summary').click();
  await page.locator('#dashboard .more-links a').filter({ hasText: 'Kalender' }).click();
  assert.match(page.url(), /\/dashboard-test\/calendar$/);
  await page.locator('#dashboard nav a').filter({ hasText: 'Klima' }).click();
  assert.match(page.url(), /\/dashboard-test\/climate$/);
  // Verify that secondary native cards inherit the same palette as custom cards.
  await page.evaluate(() => {
    const config = window.previewDashboard.views.find(view => view.path === 'system').cards[0];
    const shell = document.querySelector('#dashboard'); shell.setConfig({ ...config, appearance: { mode: 'night' }, cards: [...config.cards.map(card => ({ ...card, appearance: { mode: 'night' } })), { type: 'test-native-card' }] }); shell.hass = window.previewHass;
  });
  await page.locator('#dashboard .native-surface').waitFor();
  assert.equal(await page.locator('#dashboard .native-surface').evaluate(node => getComputedStyle(node).backgroundColor),
    await page.locator('#dashboard mufflonbau-live ha-card').evaluate(node => getComputedStyle(node).backgroundColor));
  // Admin uses explicit sources and authenticated Recorder history, with no WAN inference.
  await page.evaluate(async () => {
    const now = Date.now(); window.historyCalls = []; window.rejectHistory = false;
    window.adminHass = { ...window.previewHass, states: {
      'sensor.cpu': { state: '24', attributes: { friendly_name: 'CPU load', unit_of_measurement: '%' }, last_updated: new Date(now).toISOString() },
      'sensor.temperature': { state: '49', attributes: { friendly_name: 'CPU temperature', unit_of_measurement: '°C' } },
      'binary_sensor.wan': { state: 'off', attributes: { friendly_name: 'Internet' } },
      'device_tracker.tablet': { state: 'home', attributes: { friendly_name: 'Galaxy Tab' } },
      'device_tracker.unknown': { state: 'unknown', attributes: { friendly_name: 'Unknown device' } },
    }, callWS: async payload => {
      window.historyCalls.push(payload);
      if (window.rejectHistory) throw new Error('Recorder unavailable');
      return Object.fromEntries(payload.entity_ids.map(id => [id, Array.from({ length: 13 }, (_, index) => ({ s: index === 7 ? 'unknown' : String((id === 'sensor.cpu' ? 24 : 49) + Math.sin(index * .8) * 4), lu: (now - (12 - index) * 1800000) / 1000 }))]));
    } };
    window.adminDashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate({ language: 'en', admin: {
      internet: ['binary_sensor.wan'], host: ['sensor.cpu', 'sensor.temperature'], clients: ['device_tracker.tablet', 'device_tracker.unknown'],
    } }, window.adminHass);
    window.showAdminView = path => {
      const shell = document.querySelector('#dashboard'); shell.setConfig(window.adminDashboard.views.find(view => view.path === path).cards[0]); shell.hass = window.adminHass;
    };
    window.showAdminView('admin');
  });
  assert.equal(await page.locator('#dashboard mufflonbau-admin .group').count(), 3);
  assert.match(await page.locator('#dashboard mufflonbau-admin .panel').innerText(), /Internet: Off/);
  await page.locator('#dashboard mufflonbau-admin .group').filter({ hasText: 'Raspberry Pi' }).click();
  assert.match(page.url(), /admin-host$/);
  await page.evaluate(() => window.showAdminView('admin-host'));
  await page.locator('#dashboard mufflonbau-history svg').first().waitFor();
  assert.equal(await page.locator('#dashboard mufflonbau-history').count(), 2);
  assert.equal(await page.locator('#dashboard mufflonbau-history').first().locator('circle').count(), 12);
  await page.locator('#dashboard mufflonbau-admin button[data-entity="sensor.cpu"]').click();
  assert.equal(await page.evaluate(() => window.moreInfo.at(-1)), 'sensor.cpu');
  await page.locator('#dashboard mufflonbau-history select').first().selectOption('6');
  await page.waitForFunction(() => window.historyCalls.length === 3);
  const request = await page.evaluate(() => window.historyCalls.at(-1));
  assert.equal(request.type, 'history/history_during_period');
  assert.equal(new Date(request.end_time) - new Date(request.start_time), 6 * 3600000);
  await page.evaluate(() => { window.rejectHistory = true; });
  await page.locator('#dashboard mufflonbau-history select').first().selectOption('168');
  await page.locator('#dashboard mufflonbau-history button').first().waitFor();
  assert.match(await page.locator('#dashboard mufflonbau-history .panel').first().innerText(), /Recorder/);
  await page.evaluate(() => { window.rejectHistory = false; });
  await page.locator('#dashboard mufflonbau-history button').first().click();
  await page.locator('#dashboard mufflonbau-history svg').first().waitFor();
  for (const viewport of [{ width: 1340, height: 800 }, { width: 893, height: 533 }]) {
    await page.setViewportSize(viewport);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: `test-results/admin-host-${viewport.width}.png`, fullPage: true });
  }
  const oldChart = await page.locator('#dashboard mufflonbau-history').first().elementHandle();
  await page.evaluate(() => window.showAdminView('admin-network'));
  assert.equal(await oldChart.evaluate(card => card._loading), false);
  assert.match(await page.locator('#dashboard mufflonbau-admin .panel').innerText(), /Network devices · 1\/2/);
  assert.match(await page.locator('#dashboard mufflonbau-admin .panel').innerText(), /State unknown/);
  assert.ok(!await page.locator('#dashboard mufflonbau-admin .panel').innerText().then(value => value.includes('Offline')));
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: rendering, live updates, localization, warnings, navigation, mobile layout, safe labels, clock cleanup, actual YAML examples, complete dashboard layouts, theme consistency, device controls, action errors, admin drill-down, Recorder ranges/retry/gaps, and Galaxy Tab A11 viewport overflow.');
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) await page.screenshot({ path: 'test-results/failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

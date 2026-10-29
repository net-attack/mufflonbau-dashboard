// Browser verification shared by local npm run ci and GitHub Actions.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { previewConfig, previewHass } from './preview-fixture.mjs';
import { translations } from '../src/core/i18n.js';
import { renderViews } from './render-views.mjs';
import { checkCleaning } from './cleaning-check.mjs';
import { checkShopping } from './shopping-check.mjs';
import { checkWeatherAlerts } from './weather-alerts-check.mjs';
import { checkFlusenfels } from './flusenfels-check.mjs';
import { checkMaintenance } from './maintenance-check.mjs';
import { checkFloorplan } from './floorplan-check.mjs';
import { checkDetailViews } from './detail-check.mjs';
import { checkVentilation } from './ventilation-check.mjs';
import { checkPresence } from './presence-check.mjs';
import { checkLaundry } from './laundry-check.mjs';
import { checkUnified } from './unified-check.mjs';
import { galaxyTabA11 } from './galaxy-tab-a11.mjs';
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
let galaxyContext;
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
    window.floorplanCalls = [];
    window.sampleHass = { states, locale: { language: 'de' }, config: { time_zone: 'Europe/Berlin' }, themes: { darkMode: false }, callService: async (...args) => window.floorplanCalls.push(args) };
    const configs = [
      { mode: 'header', title: 'Mufflonbau' },
      { mode: 'climate', rooms: [room] },
      { mode: 'warnings', monitors: [{ entity: 'sensor.battery', battery_below: 20 }] },
      { mode: 'floorplan', walls: [[[260, 0], [360, 0], [360, 210]]], rooms: [{ ...room, objects: [{ id: 'lamp', icon: 'light', name: { en: 'Floor lamp', de: 'Stehlampe' }, position: { x: 0.8, y: 0.75 }, entity: 'light.room', action: 'toggle' }] }] },
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
  const germanGreeting = await page.locator('#header h1').innerText();
  assert.ok(Object.values(translations.de.greetings).flat().includes(germanGreeting), `Unexpected German greeting: ${germanGreeting}`);
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
  assert.equal(await page.locator('#header h1').innerText(), germanGreeting, 'Greeting must not change during live state updates');
  assert.equal(await page.locator('#floorplan [data-marker=lamp]').getAttribute('aria-label'), 'Stehlampe · room');
  await page.locator('#floorplan [data-marker=lamp]').click();
  assert.deepEqual(await page.evaluate(() => window.floorplanCalls[0]), ['homeassistant', 'toggle', {}, { entity_id: 'light.room' }]);
  await page.locator('#floorplan a[data-room]').click();
  assert.match(page.url(), /\/dashboard-test\/room-living$/);
  const mapGeometry = await page.locator('#floorplan .floor-map').evaluate(svg => {
    const box = svg.viewBox.baseVal;
    const label = svg.querySelector('.room-name').getBBox();
    return { right: box.x + box.width, bottom: box.y + box.height, labelLeft: label.x, labelRight: label.x + label.width };
  });
  assert.ok(mapGeometry.right > 360 && mapGeometry.bottom > 210, 'Wall outlines outside rooms must stay within the SVG viewBox');
  assert.ok(mapGeometry.labelLeft >= 0 && mapGeometry.labelRight <= 260, 'Room labels must remain inside their room');
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
  await checkCleaning(page, previewConfig, previewHass);
  await checkShopping(page, previewConfig, previewHass);
  await checkWeatherAlerts(page, previewHass);
  await checkFloorplan(page);
  await checkDetailViews(page);
  await checkFlusenfels(page);
  await checkMaintenance(page);
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
    const main = document.querySelector('main'); main.style.cssText = 'max-width:none;margin:0';
    window.calls = []; window.failAction = false;
    window.previewHass = { ...hass, callService: async (...args) => { if (window.failAction) throw new Error('Test failure'); window.calls.push(args); } };
    const result = await customElements.get('ll-strategy-dashboard-mufflonbau').generate(config, window.previewHass);
    window.previewDashboard = result;
    const shell = document.createElement('mufflonbau-shell'); shell.id = 'dashboard';
    shell.setConfig(result.views[0].cards[0]); shell.hass = window.previewHass; main.replaceChildren(shell);
  }, { config: previewConfig, hass: previewHass });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.setViewportSize({ width: 1340, height: 800 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  const homeLayout = await page.locator('#dashboard').evaluate(shell => {
    const main = shell.shadowRoot.querySelector('main'); const content = main.querySelector('.content');
    const navigation = shell.shadowRoot.querySelector('nav').getBoundingClientRect();
    const slots = [...content.children].map(slot => ({ name: slot.className, top: slot.getBoundingClientRect().top, bottom: slot.getBoundingClientRect().bottom }));
    const summaries = [...content.querySelectorAll('mufflonbau-live')]
      .filter(card => ['room-summary', 'presence-summary', 'cleaning', 'warnings'].includes(card._config.mode))
      .map(card => ({ height: card.getBoundingClientRect().height, headings: card.shadowRoot.querySelectorAll('.section-head').length }));
    return { summaries, host: shell.getBoundingClientRect().height, main: main.getBoundingClientRect().height, scroll: main.scrollHeight,
      nav: { top: navigation.top, bottom: navigation.bottom }, content: [content.clientHeight, content.scrollHeight], slots };
  });
  const homeFitsAboveNavigation = homeLayout.slots.every(slot => slot.bottom <= homeLayout.nav.top - 8);
  assert.ok(homeLayout.summaries.every(summary => summary.height <= 80 && summary.headings === 0),
    `Home summary buttons must remain compact without duplicate headings: ${JSON.stringify(homeLayout.summaries)}`);
  assert.ok(homeFitsAboveNavigation || homeLayout.host > 800 || homeLayout.scroll > homeLayout.main + 1,
    `Tablet dashboard must fit above navigation or remain scrollable: ${JSON.stringify(homeLayout)}`);
  await page.screenshot({ path: 'test-results/dashboard-ambient-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 800, height: 1340 });
  const portraitOverflow = await page.locator('#dashboard').evaluate(shell => getComputedStyle(shell).overflowY);
  assert.notEqual(portraitOverflow, 'hidden', 'Galaxy Tab portrait home view must allow scrolling');
  await page.screenshot({ path: 'test-results/dashboard-ambient-tablet-portrait.png', fullPage: true });

  // Additional smaller CSS viewport coverage, not a measured Android setting.
  galaxyContext = await browser.newContext({
    ...galaxyTabA11,
    viewport: { width: 533, height: 893 },
  });
  const galaxyPage = await galaxyContext.newPage();
  galaxyPage.on('pageerror', error => errors.push(`Galaxy Tab A11: ${error.message}`));
  await galaxyPage.goto(`http://127.0.0.1:${server.address().port}/dashboard-test/home`);
  await galaxyPage.addScriptTag({ url: '/bundle.js' });
  await galaxyPage.evaluate(async ({ config, hass }) => {
    document.body.style.margin = '0';
    document.querySelector('main').style.cssText = 'max-width:none;margin:0';
    window.galaxyCalls = [];
    window.galaxyHass = { ...hass, callService: async (...args) => window.galaxyCalls.push(args) };
    const result = await customElements.get('ll-strategy-dashboard-mufflonbau').generate(config, window.galaxyHass);
    const shell = document.createElement('mufflonbau-shell');
    shell.id = 'galaxy-dashboard';
    shell.setConfig(result.views.find(view => view.path === 'home').cards[0]);
    shell.hass = window.galaxyHass;
    document.querySelector('main').replaceChildren(shell);
  }, { config: previewConfig, hass: previewHass });
  await galaxyPage.locator('#galaxy-dashboard mufflonbau-live ha-card').first().waitFor();
  assert.equal(await galaxyPage.evaluate(() => navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches), true,
    'Galaxy Tab A11 profile must emulate a touch-first Android browser');
  assert.equal(await galaxyPage.evaluate(() => devicePixelRatio), 1.5);

  for (const viewport of [
    { name: 'portrait', width: 533, height: 893 },
    { name: 'landscape', width: 893, height: 533 },
  ]) {
    await galaxyPage.setViewportSize(viewport);
    await galaxyPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const layout = await galaxyPage.locator('#galaxy-dashboard').evaluate(shell => {
      const root = shell.shadowRoot;
      const nav = root.querySelector('nav').getBoundingClientRect();
      const slots = [...root.querySelectorAll('.slot')].map(slot => {
        const rect = slot.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
      });
      const summaries = [...root.querySelectorAll('mufflonbau-live')]
        .filter(card => ['room-summary', 'presence-summary', 'cleaning', 'warnings'].includes(card._config.mode))
        .map(card => {
          const link = card.shadowRoot.querySelector('.summary-link');
          const rect = link.getBoundingClientRect();
          return { mode: card._config.mode, href: link.getAttribute('href'), text: link.textContent.trim(), left: rect.left, right: rect.right, width: rect.width, height: rect.height,
            cardHeight: card.getBoundingClientRect().height, headings: card.shadowRoot.querySelectorAll('.section-head').length };
        });
      const targets = [...root.querySelectorAll('nav a, nav summary')]
        .filter(target => !target.closest('details') || target.matches('summary') || target.closest('details').open)
        .map(target => {
          const rect = target.getBoundingClientRect();
          return { label: target.textContent.trim(), width: rect.width, height: rect.height };
        })
        .filter(target => target.width > 0 && target.height > 0);
      return {
        viewport: { width: innerWidth, height: innerHeight },
        shellLeft: shell.getBoundingClientRect().left,
        shellRight: shell.getBoundingClientRect().right,
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
        scrollHeight: document.scrollingElement.scrollHeight,
        clientHeight: document.scrollingElement.clientHeight,
        shellOverflowY: getComputedStyle(shell).overflowY,
        nav: { left: nav.left, top: nav.top, right: nav.right, bottom: nav.bottom },
        summaries,
        slots,
        targets,
      };
    });
    assert.deepEqual(layout.viewport, { width: viewport.width, height: viewport.height });
    assert.equal(layout.shellLeft, 0, `${viewport.name}: the dashboard background must reach the left screen edge`);
    assert.equal(layout.shellRight, viewport.width, `${viewport.name}: the dashboard background must reach the right screen edge`);
    assert.ok(layout.horizontalOverflow <= 1, `${viewport.name}: dashboard must not scroll horizontally: ${JSON.stringify(layout)}`);
    assert.notEqual(layout.shellOverflowY, 'hidden', `${viewport.name}: dashboard must not clip vertical content`);
    assert.ok(layout.scrollHeight > layout.clientHeight || layout.slots.every(slot => slot.bottom <= layout.nav.top - 8),
      `${viewport.name}: the complete home dashboard must fit above navigation or remain scrollable`);
    assert.ok(layout.nav.left >= 0 && layout.nav.right <= viewport.width && layout.nav.top >= 0 && layout.nav.bottom <= viewport.height,
      `${viewport.name}: fixed navigation must remain inside the viewport: ${JSON.stringify(layout.nav)}`);
    assert.ok(layout.slots.every(slot => slot.width > 0 && slot.height > 0 && slot.left >= -1 && slot.right <= viewport.width + 1),
      `${viewport.name}: every dashboard card must have visible, non-overflowing geometry: ${JSON.stringify(layout.slots)}`);
    assert.deepEqual(layout.summaries.map(summary => summary.mode), ['room-summary', 'presence-summary', 'cleaning', 'warnings']);
    assert.ok(layout.summaries.every(summary => Math.abs(summary.width - layout.summaries[0].width) <= 1),
      `${viewport.name}: home buttons must all have the same width: ${JSON.stringify(layout.summaries)}`);
    assert.ok(layout.summaries.every(summary => summary.width >= 44 && summary.height >= 44 && summary.left >= -1 && summary.right <= viewport.width + 1),
      `${viewport.name}: home summaries must remain visible and touchable: ${JSON.stringify(layout.summaries)}`);
    assert.ok(layout.summaries.every(summary => summary.cardHeight <= 80 && summary.headings === 0),
      `${viewport.name}: summary buttons must not grow into large cards or repeat headings: ${JSON.stringify(layout.summaries)}`);
    assert.match(layout.summaries[0].text, /6 Räume/);
    assert.match(layout.summaries[0].href, /\/rooms$/);
    assert.match(layout.summaries[1].href, /\/presence$/);
    assert.match(layout.summaries[2].href, /\/cleaning$/);
    assert.match(layout.summaries[2].text, /Reinigung.*An der Station.*92 %/);
    assert.match(layout.summaries[3].href, /\/system$/);
    assert.match(layout.summaries[3].text, /Systemprüfung.*in Ordnung/);
    const verticalSlots = [...layout.slots].sort((a, b) => a.top - b.top);
    const verticalGaps = verticalSlots.slice(1).map((slot, index) => slot.top - verticalSlots[index].bottom).filter(gap => gap >= 0);
    assert.ok(verticalGaps.every(gap => gap <= 32),
      `${viewport.name}: dashboard cards must not be separated by unexplained blank space: ${JSON.stringify(verticalGaps)}`);
    assert.ok(layout.targets.length >= 5 && layout.targets.every(target => target.width >= 44 && target.height >= 44),
      `${viewport.name}: navigation touch targets must be at least 44x44 CSS pixels: ${JSON.stringify(layout.targets)}`);
    assert.equal(layout.targets.length, 8, `${viewport.name}: every destination must be directly accessible`);
    assert.deepEqual(layout.targets.slice(0, 4).map(target => target.label), ['Zuhause', 'Kalender', 'Räume', 'Reinigung']);
    assert.equal(await galaxyPage.locator('#galaxy-dashboard nav details').count(), 0);
    assert.ok(await galaxyPage.locator('#galaxy-dashboard nav a').evaluateAll(links => {
      const top = links[0].getBoundingClientRect().top;
      return links.every(link => Math.abs(link.getBoundingClientRect().top - top) < 1 && link.getAttribute('aria-label'));
    }), 'All navigation icons must stay on a single accessible row');
    await galaxyPage.screenshot({ path: `test-results/galaxy-tab-a11-${viewport.name}.png` });

    await galaxyPage.evaluate(() => scrollTo(0, document.scrollingElement.scrollHeight));
    await galaxyPage.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    const bottom = await galaxyPage.locator('#galaxy-dashboard').evaluate(shell => {
      const root = shell.shadowRoot;
      const nav = root.querySelector('nav').getBoundingClientRect();
      const slots = [...root.querySelectorAll('.slot')];
      const last = slots.at(-1).getBoundingClientRect();
      return { lastBottom: last.bottom, navTop: nav.top, scrollY, maxScroll: document.scrollingElement.scrollHeight - innerHeight };
    });
    assert.ok(Math.abs(bottom.scrollY - bottom.maxScroll) <= 1, `${viewport.name}: page must reach its maximum scroll position`);
    assert.ok(bottom.lastBottom <= bottom.navTop - 8,
      `${viewport.name}: the fixed navigation must not cover the last card: ${JSON.stringify(bottom)}`);
    await galaxyPage.evaluate(() => scrollTo(0, 0));
  }
  await galaxyPage.evaluate(() => {
    window.galaxyHass = { ...window.galaxyHass, states: { ...window.galaxyHass.states,
      'sensor.device_battery': { state: '10', attributes: { friendly_name: 'Türsensor' } } } };
    document.querySelector('#galaxy-dashboard').hass = window.galaxyHass;
  });
  const compactWarning = galaxyPage.locator('#galaxy-dashboard .mode-warnings .summary-link');
  assert.match(await compactWarning.innerText(), /1 Warnung/);
  assert.doesNotMatch(await compactWarning.innerText(), /Türsensor|10%/, 'Issue details belong to the system view');
  assert.ok((await compactWarning.boundingBox()).height <= 80, 'Active warnings must also keep the system button compact');
  await galaxyPage.evaluate(() => {
    window.galaxyHass = { ...window.galaxyHass, states: { ...window.galaxyHass.states,
      'sensor.device_battery': { state: '85', attributes: {} } } };
    document.querySelector('#galaxy-dashboard').hass = window.galaxyHass;
  });
  assert.match(await compactWarning.innerText(), /in Ordnung/);
  await galaxyPage.evaluate(() => {
    window.galaxyHass = { ...window.galaxyHass, states: { ...window.galaxyHass.states, 'sun.sun': { state: 'below_horizon', attributes: { elevation: -12 } } } };
    document.querySelector('#galaxy-dashboard').hass = window.galaxyHass;
  });
  assert.equal(await galaxyPage.locator('#galaxy-dashboard').getAttribute('data-theme'), 'storybook');
  assert.equal(await galaxyPage.locator('#galaxy-dashboard').evaluate(shell => [...shell.shadowRoot.querySelectorAll('mufflonbau-live')]
    .every(card => card.shadowRoot.querySelector('ha-card').classList.contains('night'))), true,
  'Galaxy Tab cards must switch to storybook night when the sun goes below the horizon');
  for (const viewport of [
    { name: 'portrait', width: 533, height: 893 },
    { name: 'landscape', width: 893, height: 533 },
  ]) {
    await galaxyPage.setViewportSize(viewport);
    await galaxyPage.evaluate(() => scrollTo(0, 0));
    await galaxyPage.screenshot({ path: `test-results/galaxy-tab-a11-storybook-night-${viewport.name}.png` });
  }
  await galaxyContext.close();
  galaxyContext = undefined;

  await page.setViewportSize({ width: 1340, height: 800 });
  await page.evaluate(() => {
    const shell = document.querySelector('#dashboard');
    shell.setConfig(window.previewDashboard.views.find(view => view.path === 'room-living').cards[0]);
    shell.hass = window.previewHass;
  });
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
    const contrast = await page.locator('#dashboard').evaluate(shell => {
      const properties = ['--mb-canvas', '--mb-surface', '--mb-soft', '--mb-ink', '--mb-muted', '--mb-accent', '--mb-active'];
      const expected = Object.fromEntries(properties.map(property => [property, getComputedStyle(shell).getPropertyValue(property).trim()]));
      const cards = [...shell.shadowRoot.querySelectorAll('mufflonbau-live')].map(card => card.shadowRoot.querySelector('ha-card'));
      const mismatches = cards.flatMap((card, index) => properties
        .filter(property => getComputedStyle(card).getPropertyValue(property).trim() !== expected[property])
        .map(property => ({ card: index, property, expected: expected[property], actual: getComputedStyle(card).getPropertyValue(property).trim() })));
      const parse = value => {
        const hex = value.trim().replace('#', '');
        if (![6, 8].includes(hex.length)) throw new Error(`Unsupported palette color: ${value}`);
        return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 };
      };
      const canvas = parse(expected['--mb-canvas']);
      const onCanvas = color => ({
        r: color.r * color.a + canvas.r * (1 - color.a),
        g: color.g * color.a + canvas.g * (1 - color.a),
        b: color.b * color.a + canvas.b * (1 - color.a),
        a: 1,
      });
      const luminance = color => {
        const channel = value => { const normalized = value / 255; return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4; };
        return .2126 * channel(color.r) + .7152 * channel(color.g) + .0722 * channel(color.b);
      };
      const ratio = (foreground, background) => {
        const values = [luminance(parse(expected[foreground])), luminance(onCanvas(parse(expected[background])))].sort((a, b) => b - a);
        return (values[0] + .05) / (values[1] + .05);
      };
      return { mismatches, ratios: {
        'ink/canvas': ratio('--mb-ink', '--mb-canvas'),
        'ink/surface': ratio('--mb-ink', '--mb-surface'),
        'ink/soft': ratio('--mb-ink', '--mb-soft'),
        'muted/surface': ratio('--mb-muted', '--mb-surface'),
        'accent/active': ratio('--mb-accent', '--mb-active'),
      } };
    });
    assert.deepEqual(contrast.mismatches, [], `${theme}/${mode}: every card must inherit the active theme palette`);
    for (const [pair, ratio] of Object.entries(contrast.ratios)) {
      assert.ok(ratio >= 4.5, `${theme}/${mode}: ${pair} contrast must be at least 4.5:1, got ${ratio.toFixed(2)}:1`);
    }
    const colors = await page.locator('#dashboard').evaluate(shell => [...shell.shadowRoot.querySelectorAll('mufflonbau-live')].filter(card => !['header', 'climate'].includes(card._config.mode)).map(card => getComputedStyle(card.shadowRoot.querySelector('.summary-link') ?? card.shadowRoot.querySelector('ha-card')).backgroundColor));
    assert.equal(new Set(colors).size, 1, 'Every content card must use the same surface color');
    await page.screenshot({ path: `test-results/dashboard-${theme}-${mode}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: `test-results/dashboard-${theme}-${mode}-mobile.png`, fullPage: true });
  }
  }
  await page.locator('#dashboard nav a[aria-label="Kalender"]').click();
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
      'sensor.same_one': { state: '12', attributes: { friendly_name: 'Same reading' } },
      'sensor.same_two': { state: '12', attributes: { friendly_name: 'Same reading' } },
      'sensor.download': { state: '200000', attributes: { friendly_name: 'Download', unit_of_measurement: 'kbit/s' } },
      'sensor.upload': { state: '0', attributes: { friendly_name: 'Upload', unit_of_measurement: 'kbit/s' } },
    }, callWS: async payload => {
      window.historyCalls.push(payload);
      if (window.rejectHistory) throw new Error('Recorder unavailable');
      return Object.fromEntries(payload.entity_ids.map(id => [id, Array.from({ length: 13 }, (_, index) => ({ s: index === 7 ? 'unknown' : String((id === 'sensor.download' ? 200000 : id === 'sensor.upload' ? 20000 : id === 'sensor.cpu' ? 24 : 49) + Math.sin(index * .8) * 4), lu: (now - (12 - index) * 1800000) / 1000 }))]));
    } };
    window.adminDashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate({ language: 'en', expert_entities: ['sensor.cpu', 'sensor.cpu', 'sensor.same_one', 'sensor.same_two'], admin: {
      internet: ['binary_sensor.wan', 'sensor.download', 'sensor.upload'], host: ['sensor.cpu', 'sensor.temperature'], clients: ['device_tracker.tablet', 'device_tracker.unknown'],
    } }, window.adminHass);
    window.showAdminView = path => {
      const shell = document.querySelector('#dashboard'); shell.setConfig(window.adminDashboard.views.find(view => view.path === path).cards[0]); shell.hass = window.adminHass;
    };
    window.showAdminView('admin');
  });
  assert.equal(await page.locator('#dashboard mufflonbau-admin .group').count(), 3);
  assert.match(await page.locator('#dashboard mufflonbau-admin .panel').innerText(), /Internet: Off/);
  assert.match(await page.locator('#dashboard mufflonbau-admin .panel').innerText(), /Download: 200 Mb\/s/);
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
  assert.equal(await page.locator('#dashboard mufflonbau-admin button[data-entity="binary_sensor.wan"]').count(), 0, 'Internet readings must not repeat in Network');
  await page.evaluate(() => window.showAdminView('admin-internet'));
  assert.equal(await page.locator('#dashboard mufflonbau-admin button[data-entity="sensor.download"] .value').innerText(), '200 Mb/s');
  assert.equal(await page.locator('#dashboard mufflonbau-admin button[data-entity="sensor.upload"] .value').innerText(), '0 Mb/s');
  await page.locator('#dashboard mufflonbau-history svg').waitFor();
  assert.match(await page.locator('#dashboard mufflonbau-history .times').innerText(), /Mb\/s/);
  assert.match(await page.locator('#dashboard mufflonbau-history circle title').first().textContent(), /200 Mb\/s$/);
  assert.ok((await page.locator('#dashboard mufflonbau-history svg text').allTextContents()).every(value => Number(value) < 1000), 'History axes must use converted values too');
  await page.evaluate(() => { window.showAdminView('expert'); scrollTo(0, 0); });
  const expert = page.locator('#dashboard mufflonbau-admin');
  assert.equal(await expert.locator('.expert-entity').count(), 9);
  assert.equal(await expert.locator('[data-entity="sensor.download"] .expert-value').innerText(), '200 Mb/s');
  assert.equal(await expert.locator('.expert-entity[data-entity="sensor.cpu"]').count(), 1, 'Repeated configuration must produce one row');
  assert.equal(await expert.locator('.expert-group[data-category=sensors] .expert-entity').count(), 2, 'Separate sensors with matching names and values must remain accessible');
  for (const viewport of [{ width: 2000, height: 1000 }, { width: 893, height: 533 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const geometry = await page.locator('#dashboard').evaluate(shell => {
      const main = shell.shadowRoot.querySelector('main');
      const card = shell.shadowRoot.querySelector('mufflonbau-admin');
      return { mainWidth: main.getBoundingClientRect().width, cardWidth: card.getBoundingClientRect().width,
        padding: parseFloat(getComputedStyle(main).paddingLeft) + parseFloat(getComputedStyle(main).paddingRight),
        overflow: document.documentElement.scrollWidth - innerWidth };
    });
    assert.ok(Math.abs(geometry.cardWidth - (geometry.mainWidth - geometry.padding)) < 2, `Expert must use the content width: ${JSON.stringify(geometry)}`);
    if (viewport.width === 2000) assert.ok(geometry.mainWidth > 1800, 'Expert must use wide desktop screens');
    assert.ok(geometry.overflow <= 1, 'Expert filters and rows must fit on phones');
    await page.screenshot({ path: `test-results/expert-${viewport.width}.png` });
  }
  const filter = expert.locator('#expert-category'); const search = expert.locator('#expert-search');
  await filter.selectOption('host');
  assert.equal(await expert.locator('.expert-entity').count(), 2);
  await search.fill('sensor.cpu');
  assert.equal(await expert.locator('.expert-entity').count(), 1);
  await page.evaluate(() => {
    window.adminHass = { ...window.adminHass, states: { ...window.adminHass.states,
      'sensor.cpu': { ...window.adminHass.states['sensor.cpu'], state: '31' },
    } }; document.querySelector('#dashboard').hass = window.adminHass;
  });
  assert.equal(await filter.inputValue(), 'host'); assert.equal(await search.inputValue(), 'sensor.cpu');
  assert.equal(await search.evaluate(node => node.getRootNode().activeElement === node), true, 'Live updates must preserve search focus');
  assert.equal(await expert.locator('.expert-value').innerText(), '31 %');
  await expert.locator('.expert-entity').click();
  assert.equal(await page.evaluate(() => window.moreInfo.at(-1)), 'sensor.cpu');
  await search.fill('does-not-exist');
  assert.equal(await expert.locator('.expert-entity').count(), 0);
  assert.equal(await expert.locator('[role=status]').innerText(), 'No matching entities');
  await search.fill(''); await filter.selectOption('network');
  assert.equal(await expert.locator('.expert-entity').count(), 2);
  await filter.selectOption('all');
  assert.equal(await expert.locator('.expert-entity').count(), 9);
  await page.locator('#dashboard .back-link').click(); assert.match(page.url(), /\/admin$/);
  await renderViews(page, previewConfig, previewHass);
  assert.deepEqual(errors, []);
  await checkPresence(page);
  await checkVentilation(page);
  await checkLaundry(page);
  await checkUnified(page, previewConfig, previewHass);
  console.log('Browser checks passed: rendering, live updates, rotating greetings, localization, warnings, navigation, mobile layout, safe labels, clock cleanup, actual YAML examples, complete dashboard layouts, palette contrast, theme consistency, device controls, action errors, admin drill-down, Recorder ranges/retry/gaps, and Galaxy Tab A11 touch, rotation, scrolling, navigation, and viewport geometry.');
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) await page.screenshot({ path: 'test-results/failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally {
  await galaxyContext?.close();
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

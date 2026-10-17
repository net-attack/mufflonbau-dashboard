import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { galaxyProfiles } from './galaxy-tab-a11.mjs';

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// CI uses synthetic configuration. Private previews must use a separate ignored output.
export async function renderViews(sourcePage, config, hass, { output = new URL('../test-results/views/', import.meta.url) } = {}) {
  await mkdir(output, { recursive: true });
  const captures = [];
  let paths;
  for (const profile of galaxyProfiles) {
  const context = await sourcePage.context().browser().newContext({ ...profile.options, viewport: { width: profile.viewports[0].width, height: profile.viewports[0].height } });
  try {
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('/dashboard-test/home', sourcePage.url()).href);
  await page.addScriptTag({ url: '/bundle.js' });
  await page.evaluate(() => {
    document.body.style.margin = '0';
    const main = document.querySelector('main'); main.style.cssText = 'max-width:none;margin:0';
    main.replaceChildren(Object.assign(document.createElement('mufflonbau-shell'), { id: 'dashboard' }));
    customElements.define('render-native-card', class extends HTMLElement {
      constructor() { super(); this.attachShadow({ mode: 'open' }); }
      setConfig(config) { this._config = config; }
      set hass(hass) {
        const panel = document.createElement('div');
        panel.style.cssText = 'box-sizing:border-box;padding:20px;min-height:64px;height:100%;border-radius:24px;background:var(--ha-card-background);color:var(--primary-text-color);font:13px system-ui';
        const title = document.createElement('strong');
        title.textContent = this._config.title ?? hass.states[this._config.entity]?.attributes?.friendly_name ?? (this._config.type === 'picture-entity' ? 'Reinigungskarte' : 'Home Assistant');
        panel.append(title);
        for (const id of this._config.entities ?? (this._config.entity ? [this._config.entity] : [])) {
          const entity = typeof id === 'string' ? id : id.entity;
          const detail = document.createElement('p'); const state = hass.states[entity];
          detail.textContent = `${state?.attributes?.friendly_name ?? entity} · ${state?.state ?? '–'} ${state?.attributes?.unit_of_measurement ?? ''}`; panel.append(detail);
        }
        const note = document.createElement('small'); note.textContent = 'Native HA-Karte · Test-Platzhalter'; panel.append(note);
        this.style.cssText = 'display:block;height:100%;min-width:0'; this.shadowRoot.replaceChildren(panel);
      }
    });
    window.loadCardHelpers = async () => ({ createCardElement: config => { const card = document.createElement('render-native-card'); card.setConfig(config); return card; } });
  });
  assert.equal(await page.evaluate(() => navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches), true);
  assert.equal(await page.evaluate(() => devicePixelRatio), profile.options.deviceScaleFactor);
  paths = await page.evaluate(async ({ config, hass }) => {
    window.renderHass = { ...hass, callService: async () => {}, callWS: async payload => {
      const now = Date.now() / 1000;
      return Object.fromEntries((payload.entity_ids ?? []).map(id => [id, Array.from({ length: 9 }, (_, index) => ({
        s: String(Number(hass.states[id]?.state) + Math.sin(index) * 2), lu: now - (8 - index) * 1800,
      }))]));
    } };
    const dashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate(config, window.renderHass);
    window.renderDashboard = dashboard;
    return dashboard.views.map(view => ({ path: view.path, title: view.title }));
  }, { config, hass });
  for (const viewport of profile.viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const mode of ['ambient', 'night']) {
      for (const view of paths) {
        await page.evaluate(({ path, mode }) => {
          const shell = document.querySelector('#dashboard');
          const source = window.renderDashboard.views.find(view => view.path === path).cards[0];
          const appearance = { ...source.appearance, mode };
          shell.setConfig({ ...source, appearance, cards: source.cards.map(card => ({ ...card, appearance })) });
          shell.hass = window.renderHass;
          scrollTo(0, 0);
        }, { path: view.path, mode });
        await page.waitForFunction(() => {
          const shell = document.querySelector('#dashboard');
          return shell._children.length === shell._config.cards.length && shell._children.every(card => !card._loading);
        });
        await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        const geometry = await page.locator('#dashboard').evaluate(shell => {
          const slots = [...shell.shadowRoot.querySelectorAll('.slot')].map(slot => {
            const r = slot.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height, bottom: r.bottom };
          });
          const nav = shell.shadowRoot.querySelector('nav').getBoundingClientRect();
          const cleaning = shell.shadowRoot.querySelector('mufflonbau-cleaning');
          const cleaningPanel = cleaning?.shadowRoot.querySelector('.panel').getBoundingClientRect();
          const cleaningRooms = cleaning?.shadowRoot.querySelector('.rooms')?.getBoundingClientRect();
          return { cleaningFits: !cleaningRooms || cleaningRooms.bottom <= cleaningPanel.bottom,
            overflow: document.documentElement.scrollWidth - innerWidth, width: innerWidth,
            scrollable: document.scrollingElement.scrollHeight > innerHeight, navTop: nav.top, slots };
        });
        const name = `${view.path}-${mode}-${profile.name}-${viewport.name}`;
        assert.ok(geometry.cleaningFits, `${name}: cleaning controls must fit inside their panel`);
        assert.ok(geometry.overflow <= 1, `${name}: horizontal overflow: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.slots.length && geometry.slots.every(slot => slot.width > 0 && slot.height > 0 && slot.left >= -1 && slot.right <= geometry.width + 1),
          `${name}: every view card must render inside the viewport: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.scrollable || geometry.slots.every(slot => slot.bottom <= geometry.navTop - 8),
          `${name}: content must fit above navigation or remain scrollable: ${JSON.stringify(geometry)}`);
        const file = `${name}.png`;
        // Capture the real tablet viewport; fullPage changes the apparent placement
        // of fixed navigation/backgrounds and is not what the device actually shows.
        await page.screenshot({ path: new URL(file, output).pathname });
        captures.push({ ...view, profile: profile.name, mode, orientation: viewport.name, position: 'top', file });
        if (geometry.scrollable) {
          await page.evaluate(() => scrollTo(0, document.scrollingElement.scrollHeight));
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          const end = await page.locator('#dashboard').evaluate(shell => ({
            bottom: shell.shadowRoot.querySelector('.slot:last-child').getBoundingClientRect().bottom,
            navTop: shell.shadowRoot.querySelector('nav').getBoundingClientRect().top,
          }));
          assert.ok(end.bottom <= end.navTop - 8, `${name}: the last card must be reachable above navigation: ${JSON.stringify(end)}`);
          const bottomFile = `${name}-scrolled.png`;
          await page.screenshot({ path: new URL(bottomFile, output).pathname });
          captures.push({ ...view, profile: profile.name, mode, orientation: viewport.name, position: 'bottom', file: bottomFile });
        }
      }
    }
  }
  assert.deepEqual(errors, [], `${profile.name}: no browser errors are allowed in any view`);
  } finally { await context.close(); }
  }
  assert.equal(paths.filter(view => view.path.startsWith('room-')).length, config.rooms.length, 'Every configured room must get a render');
  await writeFile(new URL('manifest.json', output), JSON.stringify({ views: paths.length, screenshots: captures.length, captures }, null, 2));
  const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard Render-Galerie</title>
<style>body{margin:24px;font:16px system-ui;background:#eeeadd;color:#243a34}h1{font-weight:450}nav{position:sticky;top:0;padding:12px;background:#eeeadd;display:flex;gap:12px;flex-wrap:wrap}select{font:inherit;padding:8px;border-radius:8px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}figure{margin:0;background:#fffdf5;border-radius:16px;padding:12px}img{width:100%;height:360px;object-fit:contain;object-position:top}figcaption{padding:10px;font-weight:600}[hidden]{display:none}a{color:inherit}</style>
<h1>Galaxy Tab A11 · ${paths.length} Ansichten · ${captures.length} Screenshots</h1><p>Synthetische Zustände. Zwei Testprofile: panel = 1340 × 800 / 800 × 1340 bei DPR 1; scaled = 893 × 533 / 533 × 893 bei DPR 1,5. Die tatsächliche Browser-Skalierung des Tablets ist noch nicht gemessen. Native Home-Assistant-Karten sind durch beschriftete Platzhalter ersetzt. Screenshots zeigen den Tablet-Bildschirm; lange Seiten zusätzlich am Scrollende.</p>
<nav><label>Ansicht <select id="view"><option value="">Alle</option>${paths.map(view => `<option value="${escapeHtml(view.path)}">${escapeHtml(view.title)}</option>`).join('')}</select></label><label>Modus <select id="mode"><option value="">Beide</option><option>ambient</option><option>night</option></select></label><label>Format <select id="orientation"><option value="">Beide</option><option>landscape</option><option>portrait</option></select></label><label>Profil <select id="profile"><option value="">Beide</option><option>panel</option><option>scaled</option></select></label></nav>
<main>${captures.map(c => `<figure data-view="${escapeHtml(c.path)}" data-profile="${c.profile}" data-mode="${c.mode}" data-orientation="${c.orientation}"><a href="${c.file}"><img loading="lazy" src="${c.file}" alt="${escapeHtml(c.title)} · ${c.mode} · ${c.profile} · ${c.orientation} · ${c.position}"></a><figcaption>${escapeHtml(c.title)} · ${c.mode} · ${c.profile} · ${c.orientation} · ${c.position === 'bottom' ? 'Scrollende' : 'Seitenanfang'}</figcaption></figure>`).join('')}</main>
<script>for(const s of document.querySelectorAll('select'))s.addEventListener('change',()=>{for(const f of document.querySelectorAll('figure'))f.hidden=[...document.querySelectorAll('select')].some(s=>s.value&&f.dataset[s.id]!==s.value)})</script></html>`;
  await writeFile(new URL('index.html', output), html);
  console.log(`Render gallery: ${paths.length} views, ${captures.length} screenshots, including all ${config.rooms.length} rooms.`);
}

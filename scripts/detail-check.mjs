import assert from 'node:assert/strict';
import { previewConfig, previewHass } from './preview-fixture.mjs';

export async function checkDetailViews(sourcePage) {
  const context = await sourcePage.context().browser().newContext({ viewport: { width: 893, height: 533 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('/dashboard-test/home', sourcePage.url()).href);
    await page.addScriptTag({ url: '/bundle.js' });
    await page.evaluate(async ({ config, hass }) => {
      document.body.style.margin = '0';
      document.querySelector('main').style.cssText = 'max-width:none;margin:0';
      window.detailHass = { ...hass, callService: async () => {} };
      window.detailDashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate(config, window.detailHass);
      window.loadCardHelpers = async () => ({ createCardElement: () => {
        const native = document.createElement('div'); native.textContent = 'Camera / history'; native.style.cssText = 'height:100%;min-height:100px;background:var(--mb-soft)'; return native;
      } });
      const shell = document.createElement('mufflonbau-shell'); shell.id = 'detail-dashboard'; document.querySelector('main').replaceChildren(shell);
      window.addEventListener('location-changed', () => {
        const path = location.pathname.split('/').at(-1);
        const view = window.detailDashboard.views.find(view => view.path === path);
        if (view) { shell.setConfig(view.cards[0]); shell.hass = window.detailHass; scrollTo(0, 0); }
      });
      document.addEventListener('hass-more-info', event => {
        window.detailMoreInfo = (window.detailMoreInfo ?? 0) + 1;
        window.detailEntity = event.detail.entityId;
      });
    }, { config: previewConfig, hass: previewHass });
    const shell = page.locator('#detail-dashboard');
    const show = async path => {
      await page.evaluate(path => {
        const shell = document.querySelector('#detail-dashboard');
        history.replaceState(null, '', `/dashboard-test/${path}`);
        shell.setConfig(window.detailDashboard.views.find(view => view.path === path).cards[0]); shell.hass = window.detailHass; scrollTo(0, 0);
      }, path);
      await page.waitForFunction(() => { const s = document.querySelector('#detail-dashboard'); return s._children.length === s._config.cards.length; });
    };
    const pinch = async viewport => {
      await viewport.scrollIntoViewIfNeeded();
      const box = await viewport.boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      const client = await context.newCDPSession(page);
      const touch = (a, b) => [{ x: x - a, y, id: 1 }, { x: x + b, y, id: 2 }];
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(35, 35) });
      for (const distance of [45, 60, 80]) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(distance, distance) });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await client.detach();
    };
    for (const size of [{ width: 893, height: 533 }, { width: 533, height: 893 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      await show('home');
      const dock = await shell.locator('nav a').evaluateAll(links => links.map(link => {
        const rect = link.getBoundingClientRect(); const svg = link.querySelector('svg').getBoundingClientRect();
        const label = link.querySelector('span');
        return { x: rect.x, right: rect.right, y: rect.y, name: link.getAttribute('aria-label'),
          labelHidden: getComputedStyle(label).display === 'none', labelTop: label.getBoundingClientRect().top, iconBottom: svg.bottom };
      }));
      assert.equal(dock.length, 8);
      assert.deepEqual(dock.slice(0, 4).map(link => link.name), ['Zuhause', 'Kalender', 'Räume', 'Reinigung']);
      assert.ok(dock.every(link => link.name && Math.abs(link.y - dock[0].y) < 1 && link.x >= 0 && link.right <= size.width), 'All dock destinations must fit on one row');
      assert.ok(dock.every(link => size.width <= 700 ? link.labelHidden : !link.labelHidden && link.labelTop >= link.iconBottom), 'Dock labels belong below icons and hide on small screens');
      await shell.locator('.mode-room-summary .summary-link').tap();
      assert.match(page.url(), /\/rooms$/);
      assert.equal(await shell.locator('.map-only').count(), 1, 'Rooms must open the full map directly from Home');
      await shell.locator('[data-room-label=living]').tap();
      assert.match(page.url(), /\/room-living$/, 'One tap on the map must open the room directly');
      assert.equal(await shell.locator('.map-toolbar select').inputValue(), 'living');
      await show('rooms');
      const frame = shell.locator('.map-viewport');
      const bounds = await frame.boundingBox();
      assert.ok(bounds.height > size.height * .7, `The room map should fill the screen: ${JSON.stringify({ size, bounds })}`);
      assert.equal(await shell.locator('.mode-climate').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'Rooms must fit without page scrolling');
      await pinch(frame);
      assert.ok(await shell.locator('mufflonbau-live').evaluate(card => card._mapCamera.zoom > 1.5), 'Two-finger pinch must enlarge the floorplan');
      assert.match(page.url(), /\/rooms$/, 'Pinch must not trigger background navigation');
      const before = await shell.locator('mufflonbau-live').evaluate(card => ({ ...card._mapCamera }));
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width / 2 + 35, bounds.y + bounds.height / 2 + 20, { steps: 5 }); await page.mouse.up();
      assert.match(page.url(), /\/rooms$/, 'Dragging must not navigate to a room or home');
      assert.notEqual(await shell.locator('mufflonbau-live').evaluate(card => card._mapCamera.x), before.x);
      await page.evaluate(() => {
        const card = document.querySelector('#detail-dashboard')._children[0];
        card.hass = { ...window.detailHass, states: { ...window.detailHass.states, 'light.living': { state: 'off', attributes: {} } } };
      });
      assert.ok(await shell.locator('mufflonbau-live').evaluate(card => card._mapCamera.zoom > 1.5), 'Live updates must preserve zoom');
      await shell.locator('.map-toolbar button[aria-label="Zoom zurücksetzen"]').click();
      assert.equal(await shell.locator('mufflonbau-live').evaluate(card => card._mapCamera.zoom), 1);
      await frame.tap({ position: { x: bounds.width - 3, y: bounds.height / 2 } });
      assert.match(page.url(), /\/home$/, 'Tapping empty map space must return home');
      await show('climate');
      const table = shell.locator('.climate-table');
      assert.equal(await table.locator('tbody tr').count(), 6);
      assert.deepEqual(await table.locator('thead th').allTextContents(), ['Raum', 'Temperatur', 'Luftfeuchtigkeit']);
      const rows = await table.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.children].map(cell => {
        const r = cell.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, overflow: cell.scrollWidth > cell.clientWidth + 1 };
      })));
      assert.ok(rows.every(row => row.length === 3 && row.every(cell => cell.y === row[0].y && !cell.overflow) && row[2].x > row[1].x), `Each room needs one row with aligned, separate readings: ${JSON.stringify(rows)}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Climate must fit the screen width');
      const temperature = table.locator('tbody tr').first().locator('button').nth(0);
      const humidity = table.locator('tbody tr').first().locator('button').nth(1);
      await temperature.tap();
      assert.equal(await page.evaluate(() => window.detailEntity), await temperature.getAttribute('data-entity'));
      await humidity.tap();
      assert.equal(await page.evaluate(() => window.detailEntity), await humidity.getAttribute('data-entity'));
      assert.match(page.url(), /\/climate$/, 'Reading clicks must stay in Climate');
      await table.locator('a[data-room=living]').tap();
      assert.match(page.url(), /\/room-living$/);
    }
    await show('climate');
    await page.evaluate(() => {
      const card = document.querySelector('#detail-dashboard')._children.find(card => card._config?.mode === 'climate');
      const rooms = [
        { id: 'living', name: 'Wohnzimmer', temperature: 'sensor.probe_temperature', humidity: 'sensor.probe_humidity' },
        { id: 'kitchen', name: 'Küche', humidity: 'sensor.kitchen_humidity', dew_point: 'sensor.kitchen_dew_point' },
      ];
      card.setConfig({ ...card._config, rooms });
      card.hass = { ...window.detailHass, states: {
        'sensor.probe_temperature': { state: 'unavailable' },
        'sensor.probe_humidity': { state: '0', attributes: { unit_of_measurement: '%' } },
        'sensor.kitchen_humidity': { state: '45', attributes: { unit_of_measurement: '%' } },
      } };
    });
    assert.deepEqual(await shell.locator('.climate-table thead th').allTextContents(), ['Raum', 'Temperatur', 'Luftfeuchtigkeit', 'Taupunkt']);
    assert.match(await shell.locator('button[data-entity="sensor.probe_temperature"]').getAttribute('aria-label'), /nicht verfügbar/);
    assert.equal(await shell.locator('button[data-entity="sensor.probe_humidity"]').innerText(), '0 %');
    assert.equal(await shell.locator('.climate-empty').count(), 2, 'Unconfigured readings must show a dash without an action');
    assert.match(await shell.locator('button[data-entity="sensor.kitchen_dew_point"]').getAttribute('aria-label'), /nicht gefunden/);
    await shell.locator('button[data-entity="sensor.probe_temperature"]').tap();
    assert.equal(await page.evaluate(() => window.detailEntity), 'sensor.probe_temperature');
    await page.evaluate(() => {
      const card = document.querySelector('#detail-dashboard')._children.find(card => card._config?.mode === 'climate');
      card.hass = { ...card._hass, states: { ...card._hass.states,
        'sensor.probe_temperature': { state: '21.5', attributes: { unit_of_measurement: '°C' } },
        'sensor.kitchen_dew_point': { state: '11.3', attributes: { unit_of_measurement: '°C' } },
      } };
    });
    assert.equal(await shell.locator('button[data-entity="sensor.probe_temperature"]').innerText(), '21,5 °C');
    assert.ok(await shell.locator('.climate-table td').evaluateAll(cells => cells.every(cell => cell.scrollWidth <= cell.clientWidth + 1)), 'Four columns must also fit on a phone with live numeric readings');
    await page.evaluate(() => window.detailMoreInfo = 0);
    for (const path of ['presence', 'system', 'climate', 'cleaning']) {
      await show(path);
      await shell.locator('main').click({ position: { x: 2, y: 100 } });
      assert.match(page.url(), /\/home$/, `${path}: empty background must return home`);
      await show(path);
      await shell.locator('.back-link').click();
      assert.match(page.url(), /\/home$/, `${path}: explicit home link must work`);
    }
    await show('presence');
    await shell.locator('.people').first().click();
    assert.match(page.url(), /\/presence$/);
    assert.equal(await page.evaluate(() => window.detailMoreInfo), 1, 'Person cards must still open entity details');
    await show('system');
    await page.evaluate(() => {
      const card = document.querySelector('#detail-dashboard')._children[0];
      const monitors = ['sensor.probe_temperature', 'sensor.probe_humidity', 'sensor.probe_battery', 'sensor.other_battery'].map(entity => ({ entity }));
      card.setConfig({ ...card._config, monitors });
      window.monitorHass = { ...window.detailHass, entities: {}, devices: {}, states: {
        'sensor.probe_temperature': { state: 'unavailable' },
        'sensor.probe_humidity': { state: 'unavailable' },
        'sensor.probe_battery': { state: 'unavailable' },
        'sensor.other_battery': { state: '80', attributes: { device_class: 'battery' } },
      } };
      card.hass = window.monitorHass;
    });
    assert.equal(await shell.locator('.warning').count(), 3);
    await page.evaluate(() => {
      window.monitorHass = { ...window.monitorHass,
        entities: Object.fromEntries(Object.keys(window.monitorHass.states).map(entity => [entity, { device_id: entity === 'sensor.other_battery' ? 'other' : 'probe' }])),
        devices: { probe: { name_by_user: 'Raumfühler', name: 'Sensor' }, other: { name: 'Anderes Gerät' } },
      };
      document.querySelector('#detail-dashboard')._children[0].hass = window.monitorHass;
    });
    assert.equal(await shell.locator('.warning').count(), 1, 'Late registry data must collapse readings without requiring state changes');
    assert.match(await shell.locator('.warning').innerText(), /Raumfühler\s+Nicht erreichbar/);
    assert.equal(await shell.locator('.warning .entity-id').count(), 0);
    assert.deepEqual(await shell.locator('.system-stat strong').allTextContents(), ['2', '1', '1']);
    await shell.locator('.warning').click();
    assert.match(page.url(), /\/system$/);
    assert.equal(await page.evaluate(() => window.detailMoreInfo), 2);
    await page.evaluate(() => {
      const card = document.querySelector('#detail-dashboard')._children[0]; card.setConfig({ ...card._config, compact: true });
    });
    assert.match(await shell.locator('.summary-detail').innerText(), /1 Warnung.*Raumfühler/s);
    await page.evaluate(() => {
      const card = document.querySelector('#detail-dashboard')._children[0]; card.setConfig({ ...card._config, compact: false });
      window.monitorHass = { ...window.monitorHass, states: {
        ...window.monitorHass.states,
        'sensor.probe_temperature': { state: '22', attributes: { unit_of_measurement: '°C' } },
        'sensor.probe_humidity': { state: '45', attributes: { unit_of_measurement: '%' } },
        'sensor.probe_battery': { state: '70', attributes: { device_class: 'battery' } },
      } }; card.hass = window.monitorHass;
    });
    assert.equal(await shell.locator('.warning').count(), 0);
    assert.deepEqual(await shell.locator('.system-stat strong').allTextContents(), ['2', '2', '0']);
    await show('cleaning');
    await shell.locator('.camera-toolbar button[aria-label=Vergrößern]').click();
    assert.match(await shell.locator('.camera-content').getAttribute('style'), /scale\(1\.5\)/);
    await pinch(shell.locator('.camera-viewport'));
    assert.ok(await shell.locator('.camera-content').evaluate(node => new DOMMatrix(getComputedStyle(node).transform).a > 2), 'The cleaning camera must also support pinch zoom');
    assert.deepEqual(errors, []);
    console.log('Detail views: full-screen map, real touch pinch, pan, live zoom persistence, background return, camera zoom and climate table passed.');
  } finally { await context.close(); }
}

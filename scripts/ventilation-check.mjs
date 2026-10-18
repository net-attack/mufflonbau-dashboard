import assert from 'node:assert/strict';

export async function checkVentilation(sourcePage) {
  const context = await sourcePage.context().browser().newContext({ viewport: { width: 893, height: 533 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('/dashboard-test/home', sourcePage.url()).href);
    await page.addScriptTag({ url: '/bundle.js' });
    await page.evaluate(async () => {
      document.body.style.margin = '0';
      document.querySelector('main').style.cssText = 'max-width:none;margin:0';
      const state = (value, unit) => ({ state: String(value), attributes: { unit_of_measurement: unit }, last_updated: new Date().toISOString() });
      window.ventHass = { states: {
        'sensor.outdoor_temperature': state(8, '°C'), 'sensor.outdoor_humidity': state(80, '%'),
        'sensor.living_temperature': state(21, '°C'), 'sensor.living_humidity': state(65, '%'),
        'sensor.bedroom_temperature': state(24, '°C'), 'sensor.bedroom_humidity': state(45, '%'),
        'sensor.bathroom_temperature': { state: 'unavailable', attributes: { unit_of_measurement: '°C' } }, 'sensor.bathroom_humidity': state(70, '%'),
        'binary_sensor.bathroom_window': { state: 'off', attributes: { friendly_name: 'Badfenster', device_class: 'opening' }, last_updated: '2020-01-01T00:00:00Z' },
      }, locale: { language: 'de' }, themes: { darkMode: false } };
      window.ventConfig = { title: 'Mufflonbau', language: 'de', appearance: { theme: 'storybook', mode: 'ambient' },
        ventilation: { outdoor_temperature: 'sensor.outdoor_temperature', outdoor_humidity: 'sensor.outdoor_humidity' },
        rooms: [
          { id: 'living', name: 'Wohnzimmer', temperature: 'sensor.living_temperature', humidity: 'sensor.living_humidity' },
          { id: 'bedroom', name: 'Schlafzimmer', temperature: 'sensor.bedroom_temperature', humidity: 'sensor.bedroom_humidity' },
          { id: 'bathroom', name: '<img src=x onerror=alert(1)>', temperature: 'sensor.bathroom_temperature', humidity: 'sensor.bathroom_humidity', windows: ['binary_sensor.bathroom_window'] },
        ],
      };
      window.ventDashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate(window.ventConfig, window.ventHass);
      const shell = document.createElement('mufflonbau-shell'); shell.id = 'vent-dashboard'; document.querySelector('main').replaceChildren(shell);
      window.showVentView = path => {
        history.replaceState(null, '', `/dashboard-test/${path}`);
        shell.setConfig(window.ventDashboard.views.find(view => view.path === path).cards[0]); shell.hass = window.ventHass; scrollTo(0, 0);
      };
      window.addEventListener('location-changed', () => window.showVentView(location.pathname.split('/').at(-1)));
      window.ventMoreInfo = [];
      document.addEventListener('hass-more-info', event => window.ventMoreInfo.push(event.detail.entityId));
      window.showVentView('home');
    });
    const shell = page.locator('#vent-dashboard');
    const summary = shell.locator('.mode-ventilation .summary-link');
    await summary.waitFor();
    assert.match(await summary.innerText(), /Lüftungsampel.*1 Raum.*Lüften trocknet.*1.*Messwerte prüfen/s);
    assert.ok((await summary.boundingBox()).height <= 80, 'Ventilation summary must stay compact');
    await summary.tap();
    assert.match(page.url(), /\/ventilation$/);
    const detail = shell.locator('.mode-ventilation');
    assert.equal(await detail.locator('.ventilation-room').count(), 3);
    assert.match(await detail.locator('[data-room=living]').innerText(), /Lüften trocknet.*Draußen kalt/s);
    assert.match(await detail.locator('[data-room=bedroom]').innerText(), /Kein Trocknungsbedarf/);
    assert.match(await detail.locator('[data-room=bathroom]').innerText(), /Messwerte prüfen.*In Home Assistant nicht verfügbar/s);
    assert.equal(await detail.locator('img').count(), 0, 'Entity labels must be text, not executable HTML');
    await detail.locator('[data-room=living] [data-entity="sensor.living_temperature"]').tap();
    assert.equal(await page.evaluate(() => window.ventMoreInfo.at(-1)), 'sensor.living_temperature');
    const windowContact = detail.locator('[data-room=bathroom] .ventilation-window');
    assert.match(await windowContact.innerText(), /Fenster geschlossen/);
    assert.equal(await detail.locator('[data-room=bedroom] .ventilation-window').count(), 0);
    await windowContact.tap();
    assert.equal(await page.evaluate(() => window.ventMoreInfo.at(-1)), 'binary_sensor.bathroom_window');
    const setContact = async state => page.evaluate(state => {
      const states = { ...window.ventHass.states };
      if (state === null) delete states['binary_sensor.bathroom_window'];
      else states['binary_sensor.bathroom_window'] = { state, attributes: { friendly_name: 'Badfenster', device_class: 'opening' } };
      window.ventHass = { ...window.ventHass, states };
      document.querySelector('#vent-dashboard').hass = window.ventHass;
    }, state);
    await setContact('on');
    assert.match(await windowContact.innerText(), /Fenster offen/);
    await shell.locator('.back-link').tap();
    assert.match(await summary.innerText(), /Fenster offen: 1/);
    await summary.tap();
    for (const [state, expected] of [['unavailable', /nicht verfügbar/], ['unknown', /Zustand unbekannt/], [null, /Entity nicht gefunden/]]) {
      await setContact(state);
      assert.match(await windowContact.innerText(), expected);
      assert.doesNotMatch(await windowContact.innerText(), /Fenster geschlossen/);
    }
    await shell.locator('.back-link').tap();
    assert.match(await summary.innerText(), /Fensterstatus unbekannt: 1/);
    await summary.tap();
    await setContact('off');
    for (const theme of ['storybook', 'atmospheric', 'calm']) {
      for (const mode of ['ambient', 'night']) {
        await page.evaluate(async ({ theme, mode }) => {
          window.ventConfig.appearance = { theme, mode };
          window.ventDashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate(window.ventConfig, window.ventHass);
          window.showVentView('ventilation');
        }, { theme, mode });
        for (const viewport of [{ width: 893, height: 533 }, { width: 533, height: 893 }, { width: 390, height: 844 }]) {
          await page.setViewportSize(viewport);
          await detail.locator('.ventilation-room').first().waitFor();
          const geometry = await detail.evaluate(slot => {
            const card = slot.querySelector('mufflonbau-live').shadowRoot;
            return { overflow: document.documentElement.scrollWidth - innerWidth,
              buttons: [...card.querySelectorAll('button,.ventilation-room h3 a')].map(button => {
                const rect = button.getBoundingClientRect(); return { height: rect.height, left: rect.left, right: rect.right };
              }) };
          });
          assert.ok(geometry.overflow <= 1, `${theme}/${mode}: no horizontal overflow`);
          assert.ok(geometry.buttons.every(button => button.height >= 44 && button.left >= -1 && button.right <= viewport.width + 1), 'Ventilation details must provide fitting touch targets');
        }
        await page.screenshot({ path: `test-results/ventilation-${theme}-${mode}.png`, fullPage: true });
      }
    }
    await page.evaluate(() => {
      window.ventHass = { ...window.ventHass, states: { ...window.ventHass.states,
        'sensor.outdoor_temperature': { ...window.ventHass.states['sensor.outdoor_temperature'], state: 'unavailable' } } };
      document.querySelector('#vent-dashboard').hass = window.ventHass;
    });
    assert.equal(await detail.locator('.ventilation-dot.dry').count(), 0, 'Outdoor failure must remove all drying recommendations immediately');
    assert.match(await detail.locator('ha-card').innerText(), /Außenwerte fehlen/);
    await page.evaluate(() => {
      const original = window.ventHass.states['sensor.outdoor_temperature'];
      window.ventHass = { ...window.ventHass, states: { ...window.ventHass.states,
        'sensor.outdoor_temperature': { ...original, state: '8', last_updated: new Date(Date.now() - 4 * 3600000).toISOString() } } };
      document.querySelector('#vent-dashboard').hass = window.ventHass;
    });
    assert.match(await detail.locator('ha-card').innerText(), /Messwert zu alt/);
    await page.evaluate(() => {
      const card = document.querySelector('#vent-dashboard').shadowRoot.querySelector('mufflonbau-live');
      window.detachedVentCard = card;
      window.ventTimerWasActive = Boolean(card._timer);
    });
    await shell.locator('.back-link').tap();
    assert.match(page.url(), /\/home$/);
    assert.equal(await page.evaluate(() => window.ventTimerWasActive && window.detachedVentCard._timer === undefined), true, 'Leaving the detail view must clear its age timer');
    await summary.waitFor();
    assert.match(await summary.innerText(), /Messwerte prüfen/);
    for (const viewport of [{ width: 1340, height: 800 }, { width: 893, height: 533 }, { width: 533, height: 893 }]) {
      await page.setViewportSize(viewport);
      await summary.scrollIntoViewIfNeeded();
      const bounds = await summary.boundingBox();
      const dock = await shell.locator('nav').boundingBox();
      const dockFixed = await shell.locator('nav').evaluate(nav => getComputedStyle(nav).position === 'fixed');
      assert.ok(bounds.height <= 80 && bounds.width > 44 && bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1);
      if (dockFixed) assert.ok(bounds.y + bounds.height <= dock.y + 1, 'The new Home summary must remain accessible above the navigation');
    }
    await page.evaluate(async () => {
      window.ventConfig.language = 'en';
      window.ventDashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate(window.ventConfig, window.ventHass);
      window.showVentView('ventilation');
    });
    assert.match(await detail.locator('ha-card').innerText(), /Ventilation.*Reading is too old/s);
    assert.match(await windowContact.innerText(), /Window closed/);
    await page.evaluate(async () => {
      const state = (value, unit) => ({ state: String(value), attributes: { unit_of_measurement: unit }, last_updated: new Date().toISOString() });
      window.ventConfig.language = 'de';
      window.ventConfig.ventilation = { outdoor_sources: [
        { name: 'West', temperature: 'sensor.outdoor_temperature', humidity: 'sensor.outdoor_humidity' },
        { name: 'East', temperature: 'sensor.east_temperature', humidity: 'sensor.east_humidity' },
      ] };
      window.ventHass = { ...window.ventHass, states: { ...window.ventHass.states,
        'sensor.east_temperature': state(12, '°C'), 'sensor.east_humidity': state(70, '%') } };
      window.ventDashboard = await customElements.get('ll-strategy-dashboard-mufflonbau').generate(window.ventConfig, window.ventHass);
      window.showVentView('ventilation');
    });
    assert.match(await detail.locator('.ventilation-sources').innerText(), /West: nicht verfügbar oder ungültig.*East: aktiv · Ersatzquelle/s);
    assert.equal(await detail.locator('.ventilation-dot.dry').count(), 1, 'Healthy backup must retain drying recommendation');
    await detail.locator('.ventilation-outdoor [data-entity="sensor.east_humidity"]').tap();
    assert.equal(await page.evaluate(() => window.ventMoreInfo.at(-1)), 'sensor.east_humidity', 'Detail action must target active source');
    await page.evaluate(() => {
      window.ventHass = { ...window.ventHass, states: { ...window.ventHass.states,
        'sensor.outdoor_temperature': { ...window.ventHass.states['sensor.outdoor_temperature'], state: '8', last_updated: new Date().toISOString() } } };
      document.querySelector('#vent-dashboard').hass = window.ventHass;
    });
    assert.match(await detail.locator('.ventilation-sources').innerText(), /West: aktiv.*East: bereit/s);
    await page.evaluate(() => {
      window.ventHass = { ...window.ventHass, states: { ...window.ventHass.states,
        'sensor.outdoor_temperature': { ...window.ventHass.states['sensor.outdoor_temperature'], state: 'unavailable' },
        'sensor.east_humidity': { ...window.ventHass.states['sensor.east_humidity'], state: 'unavailable' } } };
      document.querySelector('#vent-dashboard').hass = window.ventHass;
    });
    assert.equal(await detail.locator('.ventilation-dot.dry').count(), 0, 'Two incomplete pairs must not be combined');
    assert.match(await detail.locator('ha-card').innerText(), /Außenwerte fehlen/);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
}

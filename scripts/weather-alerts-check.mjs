import assert from 'node:assert/strict';

export async function checkWeatherAlerts(page, hass) {
  await page.evaluate(hass => {
    const card = document.createElement('mufflonbau-weather-alerts'); card.id = 'weather-alert-check';
    window.weatherTestConfig = { mode: 'compact', language: 'de', weather_alerts: { entity: 'sensor.test_weather_alerts', radar: { image_url: 'https://example.test/radar.gif' } } };
    window.weatherTestHass = { ...hass, states: { ...hass.states, 'sensor.test_weather_alerts': { state: '0', attributes: { warnings: [] } } } };
    card.setConfig(window.weatherTestConfig); card.hass = window.weatherTestHass; document.querySelector('main').append(card);
  }, hass);
  const card = page.locator('#weather-alert-check');
  assert.equal(await card.locator('button').count(), 1, 'Clear weather occupies only one compact radar control');
  assert.equal(await card.locator('.warning').count(), 0);
  await card.locator('button').click();
  assert.match(page.url(), /#mufflonbau-rain-radar$/);
  await page.evaluate(() => {
    history.replaceState(null, '', location.pathname);
    const warnings = [
      { id: 'test-1', source: 'DWD', level: 1, title: 'Frost', area: 'Test area', severity: 'Stufe 1', description: 'Test' },
      { id: 'test-2', source: 'NINA', level: 3, title: '<img src=x onerror=alert(1)>', area: 'Test area', severity: 'severe', description: 'Test', instruction: 'Close windows' },
    ];
    window.weatherTestHass = { ...window.weatherTestHass, states: { ...window.weatherTestHass.states,
      'sensor.test_weather_alerts': { state: '2', attributes: { warnings, problems: ['Another NINA slot unavailable'], popup_token: 'synthetic-new-warning' } },
    } };
    localStorage.clear(); document.querySelector('#weather-alert-check').hass = window.weatherTestHass;
  });
  assert.equal(await card.locator('.warning').count(), 2);
  assert.equal(await card.locator('.problem').count(), 0, 'Active alerts survive a partial source outage without Home error details');
  assert.equal(await card.locator('.level-3 img').count(), 0, 'Warning HTML must be inert text');
  await page.waitForURL(/#mufflonbau-weather-warnings$/);
  await page.evaluate(() => {
    history.replaceState(null, '', location.pathname);
    document.querySelector('#weather-alert-check').hass = { ...window.weatherTestHass };
  });
  await page.waitForTimeout(650);
  assert.doesNotMatch(page.url(), /#mufflonbau-weather-warnings$/, 'Refreshes must not reopen an acknowledged warning');
  await page.evaluate(() => { document.querySelector('#weather-alert-check').setConfig({ ...window.weatherTestConfig, mode: 'details' }); });
  assert.equal(await card.locator('article').count(), 2);
  assert.match(await card.locator('article').first().innerText(), /NINA/);
  assert.match(await card.locator('article').first().innerText(), /Close windows/);
  await page.evaluate(() => { document.querySelector('#weather-alert-check').hass = { ...window.weatherTestHass, states: {} }; });
  assert.match(await card.locator('.problem').innerText(), /unvollständig/);
  assert.match(await card.locator('a').getAttribute('href'), /\/system$/);
  await page.evaluate(() => document.querySelector('#weather-alert-check').setConfig({ ...window.weatherTestConfig, mode: 'status' }));
  assert.match(await card.locator('button').first().innerText(), /Warnstatus prüfen/);
  await page.evaluate(() => {
    document.querySelector('#weather-alert-check').hass = { ...window.weatherTestHass, states: {
      'sensor.test_weather_alerts': { state: '0', attributes: { warnings: [], problems: [] } },
    } };
  });
  assert.match(await card.locator('button').first().innerText(), /Keine aktiven Warnungen/);
  assert.equal(await card.locator('button').count(), 2, 'Klima keeps warning status and radar reachable when clear');
  await card.locator('button').first().click();
  assert.match(page.url(), /#mufflonbau-weather-warnings$/);
  await page.evaluate(() => {
    document.querySelector('#weather-alert-check').hass = { ...window.weatherTestHass, states: {
      'sensor.test_weather_alerts': { state: '0', attributes: { warnings: [], problems: ['DWD nicht erreichbar'] } },
    } };
  });
  assert.match(await card.locator('button').first().innerText(), /Warnstatus prüfen/);
  assert.equal(await card.locator('.problem').count(), 0, 'Klima keeps only the short warning status');
  await page.evaluate(() => {
    const system = document.createElement('mufflonbau-live'); system.id = 'weather-system-check';
    // An explicitly monitored aggregate must still count only once.
    system.setConfig({ mode: 'warnings', language: 'de', monitors: [{ entity: 'sensor.test_weather_alerts' }], weather_alerts: window.weatherTestConfig.weather_alerts });
    system.hass = { ...window.weatherTestHass, states: { 'sensor.test_weather_alerts': { state: '0', attributes: {
      problems: ['NINA slot unavailable', 'NINA slot unavailable', 'DWD offline'],
    } } } };
    document.querySelector('main').append(system);
    window.weatherSystemHass = system._hass;
    document.querySelector('#weather-alert-check').setConfig(window.weatherTestConfig);
    document.querySelector('#weather-alert-check').hass = system._hass;
  });
  const system = page.locator('#weather-system-check');
  assert.equal(await card.locator('.problem').count(), 0, 'Home never lists technical source failures');
  assert.doesNotMatch(await card.locator('.controls').innerText(), /NINA slot unavailable|DWD offline|Keine aktiven Warnungen/);
  assert.equal(await system.locator('.warning').count(), 1);
  assert.match(await system.locator('.warning').innerText(), /NINA slot unavailable · DWD offline/);
  assert.deepEqual(await system.locator('.system-stat strong').allTextContents(), ['1', '0', '1']);
  await page.evaluate(() => {
    const system = document.querySelector('#weather-system-check');
    system.setConfig({ ...system._config, compact: true });
  });
  assert.match(await system.locator('ha-card').innerText(), /1 Warnung/);
  assert.doesNotMatch(await system.locator('ha-card').innerText(), /NINA slot unavailable|DWD offline/);
  for (const state of [null, 'unknown', 'unavailable', '0']) {
    await page.evaluate(state => {
      const hass = { ...window.weatherSystemHass, states: state === null ? {} : { 'sensor.test_weather_alerts': { state, attributes: { warnings: [], problems: [] } } } };
      const system = document.querySelector('#weather-system-check');
      system.setConfig({ ...system._config, compact: false }); system.hass = hass;
      document.querySelector('#weather-alert-check').hass = hass;
    }, state);
    assert.equal(await card.locator('.problem').count(), 0);
    assert.equal(await system.locator('.warning').count(), state === '0' ? 0 : 1);
    assert.deepEqual(await system.locator('.system-stat strong').allTextContents(), state === '0' ? ['1', '1', '0'] : ['1', '0', '1']);
  }
  await page.evaluate(() => document.querySelector('#weather-system-check').remove());
  await page.evaluate(() => document.querySelector('#weather-alert-check').remove());
  console.log('Weather: compact clear state, severity, safe details, radar navigation, automatic popup and refresh deduplication passed.');
}

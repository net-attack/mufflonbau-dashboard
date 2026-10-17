import assert from 'node:assert/strict';

export async function checkCleaning(page, config, hass) {
  await page.evaluate(({ config, hass }) => {
    window.cleaningCalls = []; window.cleaningReject = false;
    window.cleaningHass = { ...hass, callService: async (...args) => {
      window.cleaningCalls.push(args);
      if (window.cleaningReject) throw new Error('Test failure');
      if (window.cleaningHold) await new Promise(resolve => { window.cleaningRelease = resolve; });
    } };
    const card = document.createElement('mufflonbau-cleaning'); card.id = 'cleaning-controls';
    window.cleaningConfig = { cleaning: config.cleaning, rooms: config.rooms, language: 'de' };
    card.setConfig(window.cleaningConfig); card.hass = window.cleaningHass; document.querySelector('main').append(card);
  }, { config, hass });
  const panel = page.locator('#cleaning-controls');
  for (const [mode, domain, service] of [['vacuum', 'input_button', 'press'], ['mop', 'input_button', 'press'], ['clean_genius', 'script', 'turn_on']]) {
    const count = await page.evaluate(() => window.cleaningCalls.length);
    await panel.locator(`[data-mode="${mode}"]`).click();
    assert.equal(await page.evaluate(() => window.cleaningCalls.length), count, 'Choosing a mode alone must never start a clean');
    assert.equal(await panel.locator(`[data-mode="${mode}"]`).getAttribute('aria-pressed'), 'true');
    await panel.locator('[data-room=living]').click();
    await page.waitForFunction(expected => window.cleaningCalls.length === expected, count + 1);
    assert.deepEqual(await page.evaluate(() => window.cleaningCalls.at(-1)), [domain, service, {}, { entity_id: config.rooms[0].cleaning[mode] }]);
    assert.equal(await panel.locator('dialog').count(), 0, 'Rooms must start the chosen action directly without a second dialog');
  }
  await page.evaluate(() => { window.cleaningReject = true; });
  await panel.locator('[data-room=living]').click();
  await panel.locator('[role=alert]').waitFor();
  assert.match(await panel.locator('[role=alert]').innerText(), /fehlgeschlagen/);
  assert.equal(await panel.locator('[data-room=living]').isEnabled(), true);
  await page.evaluate(() => { window.cleaningReject = false; window.cleaningHold = true; });
  await panel.locator('[data-room=living]').click();
  assert.equal(await panel.locator('button:enabled').count(), 0, 'Pending actions must prevent duplicate starts and mode changes');
  await page.evaluate(() => { window.cleaningHold = false; window.cleaningRelease(); });
  await panel.locator('[data-room=living]:enabled').waitFor();
  await page.evaluate(() => {
    const rooms = window.cleaningConfig.rooms.map(room => ({ ...room, cleaning: { vacuum: room.cleaning.vacuum, mop: room.cleaning.mop } }));
    document.querySelector('#cleaning-controls').setConfig({ ...window.cleaningConfig, rooms });
  });
  assert.equal(await panel.locator('[data-mode=clean_genius]').isDisabled(), true, 'CleanGenius must not pretend to work without a configured helper');
  await page.evaluate(() => {
    window.cleaningHass = { ...window.cleaningHass, states: { ...window.cleaningHass.states, 'input_button.vacuum_living': { state: 'unavailable', attributes: {} } } };
    document.querySelector('#cleaning-controls').hass = window.cleaningHass;
  });
  assert.equal(await panel.locator('[data-room=living]').isDisabled(), true, 'Unavailable helpers must not be invoked');
  await page.evaluate(() => {
    window.cleaningHass = { ...window.cleaningHass, states: { ...window.cleaningHass.states, 'input_button.vacuum_living': { state: '2026-10-17', attributes: {} } } };
    document.querySelector('#cleaning-controls').hass = window.cleaningHass;
  });
  assert.equal(await panel.locator('[data-room=living]').isEnabled(), true, 'Recovered helpers must become usable without reloading');
  await page.evaluate(() => document.querySelector('#cleaning-controls').remove());
}

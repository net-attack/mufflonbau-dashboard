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
  await page.evaluate(() => {
    const summary = document.createElement('mufflonbau-live'); summary.id = 'cleaning-summary';
    summary.setConfig({ mode: 'cleaning', compact: true, cleaning: window.cleaningConfig.cleaning, language: 'de' });
    document.querySelector('main').append(summary);
  });
  for (const [attributes, expected] of [
    [{ cleaning_mode: 'Sweeping' }, 'Saugen'],
    [{ cleaning_mode: 'Mopping' }, 'Wischen'],
    [{ cleaning_mode: 'Sweeping', cleangenius: 'Routine cleaning', cleangenius_mode: 'Mop after vacuum' }, 'CleanGenius'],
    [{}, 'Reinigungsart nicht gemeldet'],
  ]) {
    await page.evaluate(attributes => {
      const card = document.querySelector('#cleaning-controls');
      const live = { ...window.cleaningHass, states: { ...window.cleaningHass.states, 'vacuum.robot': { state: 'cleaning', attributes } } };
      card.hass = live; document.querySelector('#cleaning-summary').hass = live;
    }, attributes);
    assert.equal(await panel.locator('.running-mode strong').innerText(), expected);
    assert.match(await page.locator('#cleaning-summary .summary-detail').innerText(), new RegExp(expected));
    await panel.locator('[data-mode=mop]').click();
    assert.equal(await panel.locator('.running-mode strong').innerText(), expected, 'Selecting a future room action must not change the reported running mode');
  }
  await page.evaluate(() => { document.querySelector('#cleaning-controls').hass = window.cleaningHass; document.querySelector('#cleaning-summary').remove(); });
  assert.equal(await panel.locator('.running-mode').count(), 0, 'Docked robots must not show a running cleaning type');
  for (const [state, command, service] of [
    ['docked', 'start_pause', 'start'], ['cleaning', 'start_pause', 'pause'],
    ['paused', 'start_pause', 'start'], ['returning', 'start_pause', 'pause'],
    ['cleaning', 'stop', 'stop'], ['cleaning', 'return_home', 'return_to_base'],
  ]) {
    await page.evaluate(state => {
      const robot = window.cleaningHass.states['vacuum.robot'];
      document.querySelector('#cleaning-controls').hass = { ...window.cleaningHass, states: {
        ...window.cleaningHass.states, 'vacuum.robot': { ...robot, state },
      } };
    }, state);
    await panel.locator(`[data-command="${command}"]`).click();
    assert.deepEqual(await page.evaluate(() => window.cleaningCalls.at(-1)), ['vacuum', service, {}, { entity_id: config.cleaning.entity }]);
  }
  await page.evaluate(() => {
    const vacuum = { ...window.cleaningHass.services.vacuum }; delete vacuum.stop;
    document.querySelector('#cleaning-controls').hass = { ...window.cleaningHass, services: { vacuum } };
  });
  assert.equal(await panel.locator('[data-command=stop]').isDisabled(), true, 'Unregistered actions must not be invoked');
  await page.evaluate(() => { document.querySelector('#cleaning-controls').hass = window.cleaningHass; });
  assert.equal(await panel.locator('[data-command=stop]').isEnabled(), true, 'Service registration changes must update controls');
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
  assert.match(await panel.locator('.mode-note').innerText(), /CleanGenius.*Keine Raumaktion eingerichtet/);
  await page.evaluate(() => {
    const states = { ...window.cleaningHass.states };
    delete states['input_button.vacuum_kitchen'];
    states['input_button.vacuum_bathroom'] = { state: 'unknown', attributes: {} };
    document.querySelector('#cleaning-controls').hass = { ...window.cleaningHass, states };
  });
  assert.equal(await panel.locator('[data-room=kitchen]').isDisabled(), true);
  assert.match(await panel.locator('[data-room=kitchen]').innerText(), /Entity nicht gefunden.*input_button\.vacuum_kitchen/s);
  assert.equal(await panel.locator('[data-room=bathroom]').isEnabled(), true, 'A never-pressed input button must stay usable');
  assert.doesNotMatch(await panel.locator('[data-room=bathroom]').innerText(), /Zustand unbekannt/);
  await panel.locator('[data-room=bathroom]').click();
  assert.deepEqual(await page.evaluate(() => window.cleaningCalls.at(-1)), ['input_button', 'press', {}, { entity_id: 'input_button.vacuum_bathroom' }]);
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

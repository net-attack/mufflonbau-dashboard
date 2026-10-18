import assert from 'node:assert/strict';

export async function checkLaundry(page) {
  await page.evaluate(() => {
    window.laundryCalls = [];
    window.laundryHass = { states: {
      'sensor.example_washer_power': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'switch.example_washer': { state: 'on' },
      'input_select.example_washer_phase': { state: 'idle' },
    }, locale: { language: 'de' }, config: { time_zone: 'Europe/Berlin' }, callService: async (...args) => window.laundryCalls.push(args) };
    const card = document.createElement('mufflonbau-laundry'); card.id = 'laundry-test';
    card.setConfig({ language: 'de', laundry: [{ id: 'washer', name: 'Waschmaschine', power: 'sensor.example_washer_power', plug: 'switch.example_washer', status: 'input_select.example_washer_phase' }] });
    card.hass = window.laundryHass; document.querySelector('main').replaceChildren(card);
    window.updateLaundry = (phase, power = '0', unit = 'W') => {
      window.laundryHass = { ...window.laundryHass, states: { ...window.laundryHass.states,
        'sensor.example_washer_power': { state: power, attributes: { unit_of_measurement: unit } },
        'input_select.example_washer_phase': { state: phase },
      } }; card.hass = window.laundryHass;
    };
  });
  const card = page.locator('#laundry-test');
  assert.match(await card.locator('ha-card').innerText(), /Waschmaschine: Bereit/);
  assert.equal(await card.locator('.ack').count(), 0);
  await card.locator('.open').click();
  assert.equal(await card.locator('dialog').evaluate(dialog => dialog.open), true);
  assert.match(await card.locator('dialog').innerText(), /Leistung: 0 W/);
  await page.evaluate(() => window.updateLaundry('running', '210'));
  assert.equal(await card.locator('dialog').evaluate(dialog => dialog.open), true, 'Live updates retain the open touch dialog');
  assert.match(await card.locator('dialog .state').innerText(), /Läuft/);
  await page.evaluate(() => window.updateLaundry('finishing', '0'));
  assert.match(await card.locator('dialog .state').innerText(), /geprüft/);
  await page.evaluate(() => window.updateLaundry('finished'));
  assert.equal(await card.locator('ha-card.ready').count(), 1);
  await page.evaluate(() => window.updateLaundry('starting_after_finished', '100'));
  assert.match(await card.locator('dialog .state').innerText(), /Fertig/);
  assert.equal(await card.locator('ha-card.ready').count(), 1, 'Short candidate starts retain completion');
  await page.evaluate(() => window.updateLaundry('finished'));
  await card.locator('.ack').click();
  assert.deepEqual(await page.evaluate(() => window.laundryCalls), [['input_select', 'select_option', { option: 'idle' }, { entity_id: 'input_select.example_washer_phase' }]]);
  await page.evaluate(() => window.updateLaundry('idle', 'unavailable'));
  assert.match(await card.locator('dialog .state').innerText(), /Messung nicht verfügbar/);
  assert.match(await card.locator('dialog').innerText(), /Leistung: —/);
  await page.evaluate(() => window.updateLaundry('running', '0.2', 'kW'));
  assert.match(await card.locator('dialog .state').innerText(), /Messung nicht verfügbar/);
  assert.match(await card.locator('dialog').innerText(), /Leistung: —/);
  await page.keyboard.press('Escape');
  assert.equal(await card.locator('dialog').evaluate(dialog => dialog.open), false);
  for (const viewport of [{ width: 893, height: 533 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await card.locator('.open').click();
    const box = await card.locator('dialog').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= viewport.width);
    assert.ok(box.y >= 0 && box.y + box.height <= viewport.height);
    assert.ok(await card.locator('.close').evaluate(button => button.getBoundingClientRect().height >= 44));
    if (viewport.width === 893) await page.screenshot({ path: 'test-results/laundry-tablet.png' });
    await card.locator('.close').click();
  }
  await page.evaluate(() => {
    const card = document.querySelector('#laundry-test');
    card.setConfig({ language: 'en', laundry: [{ id: 'washer', name: '<img src=x onerror=alert(1)>', power: 'sensor.example_washer_power', status: 'input_select.missing' }] });
  });
  assert.equal(await card.locator('img').count(), 0);
  assert.match(await card.locator('ha-card').innerText(), /Detection not set up yet/);
  assert.equal(await page.evaluate(() => window.laundryCalls.length), 1, 'Rendering/reloads must never send notifications or operate plugs');
  await page.evaluate(() => {
    const timestamp = 1792327200;
    window.laundryCalls = []; window.laundryFinished = timestamp;
    window.laundryHass = { ...window.laundryHass, states: {
      'sensor.example_washer_power': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.example_dryer_power': { state: '480', attributes: { unit_of_measurement: 'W' } },
      'input_select.example_washer_phase': { state: 'finished' },
      'input_select.example_dryer_phase': { state: 'running' },
      'input_datetime.washer_finished': { state: '2026-10-18 13:20:00', attributes: { timestamp } },
      'input_datetime.washer_ack': { state: '1970-01-01 00:00:00', attributes: { timestamp: 0 } },
      'input_datetime.dryer_finished': { state: '1970-01-01 00:00:00', attributes: { timestamp: 0 } },
      'input_datetime.dryer_ack': { state: '1970-01-01 00:00:00', attributes: { timestamp: 0 } },
    }, callService: async (...args) => {
      window.laundryCalls.push(args);
      if (window.laundryReject) throw new Error('Synthetic acknowledgement failure');
      if (window.laundryHold) await new Promise(resolve => { window.releaseLaundry = resolve; });
    } };
    window.persistentLaundryConfig = { language: 'de', laundry: [
      { id: 'washer', name: 'Waschmaschine', power: 'sensor.example_washer_power', status: 'input_select.example_washer_phase', last_finished: 'input_datetime.washer_finished', acknowledged: 'input_datetime.washer_ack' },
      { id: 'dryer', name: 'Trockner', power: 'sensor.example_dryer_power', status: 'input_select.example_dryer_phase', last_finished: 'input_datetime.dryer_finished', acknowledged: 'input_datetime.dryer_ack' },
    ] };
    const card = document.querySelector('#laundry-test'); card.setConfig(window.persistentLaundryConfig); card.hass = window.laundryHass;
    window.patchLaundry = patch => { window.laundryHass = { ...window.laundryHass, states: { ...window.laundryHass.states, ...patch } }; card.hass = window.laundryHass; };
  });
  await card.locator('.open').click();
  assert.match(await card.locator('[data-appliance=washer]').innerText(), /Fertig.*bis zu deiner Bestätigung/s);
  assert.match(await card.locator('[data-appliance=dryer] .state').innerText(), /Läuft/);
  assert.equal(await card.locator('[data-appliance=dryer] .ack').count(), 0, 'Dryer is independent of the completed wash');
  await card.locator('.close').click();
  assert.equal(await card.locator('ha-card.ready').count(), 1, 'Closing is not an acknowledgement');
  await page.evaluate(() => {
    const card = document.querySelector('#laundry-test'); card.setConfig(window.persistentLaundryConfig); card.hass = window.laundryHass;
  });
  await card.locator('.open').click();
  assert.equal(await card.locator('[data-appliance=washer] .ack').count(), 1, 'Completion survives a card reload');
  await page.evaluate(() => window.patchLaundry({ 'input_select.example_washer_phase': { state: 'running' } }));
  assert.match(await card.locator('[data-appliance=washer]').innerText(), /Läuft.*Fertigmeldung offen/s);
  await page.evaluate(() => { window.laundryReject = true; });
  await card.locator('[data-action=ack-washer]').click();
  await card.locator('[data-appliance=washer] [role=alert]').waitFor();
  assert.equal(await card.locator('ha-card.ready').count(), 1, 'Failed confirmation retains completion');
  await page.evaluate(() => { window.laundryReject = false; window.laundryHold = true; });
  await card.locator('[data-action=ack-washer]').click();
  await page.evaluate(() => window.patchLaundry({ 'sensor.example_dryer_power': { state: '490', attributes: { unit_of_measurement: 'W' } } }));
  assert.equal(await card.locator('[data-action=ack-washer]').isDisabled(), true, 'Live updates must not unlock an in-flight acknowledgement');
  assert.equal(await page.evaluate(() => window.laundryCalls.length), 2);
  await page.evaluate(() => { window.laundryHold = false; window.releaseLaundry(); });
  await card.locator('[data-action=ack-washer]:enabled').waitFor();
  assert.deepEqual(await page.evaluate(() => window.laundryCalls.at(-1)), ['input_datetime', 'set_datetime', { timestamp: 1792327200 }, { entity_id: 'input_datetime.washer_ack' }]);
  await page.evaluate(() => window.patchLaundry({ 'input_datetime.washer_ack': { state: '2026-10-18 13:20:00', attributes: { timestamp: window.laundryFinished } } }));
  assert.equal(await card.locator('.ack').count(), 0);
  assert.match(await card.locator('[data-appliance=washer] .state').innerText(), /Läuft/, 'Acknowledging an old completion does not reset the next wash');
  assert.match(await card.locator('[data-appliance=dryer] .state').innerText(), /Läuft/);
  await page.evaluate(() => window.patchLaundry({
    'input_datetime.washer_finished': { state: '2026-10-18 14:20:00', attributes: { timestamp: window.laundryFinished + 3600 } },
    'input_select.example_washer_phase': { state: 'finished' },
  }));
  assert.equal(await card.locator('[data-appliance=washer] .ack').count(), 1, 'A subsequent completion needs its own acknowledgement');
  assert.equal(await page.evaluate(() => window.laundryCalls.length), 2, 'Only deliberate acknowledgements write helpers');
  await page.evaluate(() => document.querySelector('#laundry-test').remove());
}

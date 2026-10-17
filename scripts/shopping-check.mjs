import assert from 'node:assert/strict';

export async function checkShopping(page, config, hass) {
  await page.evaluate(({ config, hass }) => {
    window.shoppingCalls = []; window.shoppingReject = false; window.shoppingHold = false;
    window.shoppingHass = { ...hass, callService: async (...args) => {
      window.shoppingCalls.push(args);
      if (window.shoppingHold) await new Promise(resolve => { window.shoppingRelease = resolve; });
      if (window.shoppingReject) throw new Error('Synthetic failure');
    } };
    const card = document.createElement('mufflonbau-shopping'); card.id = 'shopping-controls';
    card.setConfig({ shopping: config.shopping, language: 'de' }); card.hass = window.shoppingHass;
    document.querySelector('main').append(card);
  }, { config, hass });
  const card = page.locator('#shopping-controls');
  assert.match(await card.locator('a').innerText(), /Einkaufsliste.*3 offene Einträge/s);
  assert.equal(await card.locator('button').isDisabled(), true);
  await card.locator('input').fill('   ');
  assert.equal(await card.locator('button').isDisabled(), true);
  await card.locator('input').fill('  Hafermilch  ');
  await page.evaluate(() => {
    const old = window.shoppingHass.states['todo.family_shopping'];
    document.querySelector('#shopping-controls').hass = { ...window.shoppingHass, states: { ...window.shoppingHass.states, 'todo.family_shopping': { ...old, state: '4' } } };
  });
  assert.equal(await card.locator('input').inputValue(), '  Hafermilch  ', 'A live update must preserve the draft');
  await card.locator('input').press('Enter');
  assert.deepEqual(await page.evaluate(() => window.shoppingCalls.at(-1)), ['todo', 'add_item', { item: 'Hafermilch' }, { entity_id: config.shopping.entity }]);
  assert.equal(await card.locator('input').inputValue(), '');
  assert.match(await card.locator('[role=status]').innerText(), /Hinzugefügt/);
  assert.match(await card.locator('a').innerText(), /4 offene Einträge/, 'Only HA state updates change the count');
  await page.evaluate(() => { window.shoppingReject = true; });
  await card.locator('input').fill('Brot'); await card.locator('button').click();
  assert.match(await card.locator('[role=alert]').innerText(), /fehlgeschlagen/);
  assert.equal(await card.locator('input').inputValue(), 'Brot');
  await page.evaluate(() => { window.shoppingReject = false; window.shoppingHold = true; });
  const before = await page.evaluate(() => window.shoppingCalls.length);
  await card.locator('button').click();
  assert.equal(await card.locator('button').isDisabled(), true);
  await card.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
  assert.equal(await page.evaluate(() => window.shoppingCalls.length), before + 1, 'Pending submissions must not be duplicated');
  await page.evaluate(() => { window.shoppingHold = false; window.shoppingRelease(); });
  await card.locator('input:enabled').waitFor();
  await page.evaluate(() => { document.querySelector('#shopping-controls').hass = { ...window.shoppingHass, states: { ...window.shoppingHass.states, 'todo.family_shopping': { state: 'unavailable', attributes: {} } } }; });
  assert.equal(await card.locator('button').isDisabled(), true);
  assert.match(await card.locator('a').innerText(), /nicht verfügbar/);
  await card.locator('a').click(); assert.match(page.url(), /\/shopping$/);
  await page.evaluate(() => document.querySelector('#shopping-controls').remove());
  console.log('Shopping: explicit list, quick add, Enter, draft preservation, write failures, duplicate prevention and navigation passed.');
}

import assert from 'node:assert/strict';

export async function checkPresence(sourcePage) {
  const context = await sourcePage.context().browser().newContext({ viewport: { width: 893, height: 533 } });
  try {
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('/dashboard-test/presence', sourcePage.url()).href);
    await page.addScriptTag({ url: '/bundle.js' });
    await page.evaluate(() => {
      window.presenceCalls = []; window.presenceReject = false;
      const now = Date.now();
      window.presenceHass = { states: {
        'person.alex': { state: 'home', last_changed: new Date(now - 2 * 3600000).toISOString(), attributes: { friendly_name: 'Alex' } },
        'person.sam': { state: 'unavailable', last_changed: new Date(now - 3600000).toISOString(), attributes: { friendly_name: 'Sam' } },
      }, config: { time_zone: 'Europe/Berlin' }, themes: { darkMode: true }, callWS: async payload => {
        window.presenceCalls.push(payload);
        if (window.presenceReject) throw new Error('Private backend details must not leak');
        return { 'person.alex': [
          { s: 'home', lc: Date.parse(payload.start_time) / 1000 - 86400 },
          { s: 'not_home', lc: now / 1000 - 4 * 3600 },
          { s: 'home', lc: now / 1000 - 2 * 3600 },
        ] };
      } };
      const card = document.createElement('mufflonbau-presence'); card.id = 'presence-test';
      card.setConfig({ people: ['person.alex', 'person.sam'], language: 'de', appearance: { mode: 'night' } });
      card.hass = window.presenceHass;
      document.querySelector('main').replaceChildren(card);
      document.addEventListener('hass-more-info', event => window.presenceMoreInfo = event.detail.entityId);
    });
    const card = page.locator('#presence-test');
    await page.waitForFunction(() => !!document.querySelector('#presence-test')._data);
    assert.equal(await card.locator('.person').count(), 2);
    assert.equal(await card.locator('.day').count(), 14);
    assert.equal(await card.locator('.person').first().locator('.fact').nth(1).locator('dd').innerText(), '1');
    assert.equal(await card.locator('.person').nth(1).locator('.fact').nth(1).locator('dd').innerText(), '—');
    assert.equal(await card.locator('.person').nth(1).locator('.badge').innerText(), 'Status unbekannt');
    const calls = await page.evaluate(() => window.presenceCalls);
    assert.equal(calls.length, 1); assert.deepEqual(calls[0].entity_ids, ['person.alex', 'person.sam']);
    assert.equal(calls[0].type, 'history/history_during_period');
    await card.locator('.people').first().click();
    assert.equal(await page.evaluate(() => window.presenceMoreInfo), 'person.alex');
    for (const size of [{ width: 893, height: 533 }, { width: 533, height: 893 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      assert.ok(await card.locator('.people').evaluateAll(headers => headers.every(node => node.getBoundingClientRect().height < 100)), 'Person headers must stay compact');
      assert.ok(await card.locator('.person').evaluateAll(panels => panels.every(node => node.scrollWidth <= node.clientWidth + 1)), 'Facts and weekly activity must fit each panel');
    }
    await page.evaluate(() => { window.presenceReject = true; document.querySelector('#presence-test')._load(); });
    await card.locator('.retry').waitFor();
    assert.equal(await card.locator('.person').first().locator('.fact').nth(1).locator('dd').innerText(), '—');
    assert.doesNotMatch(await card.innerText(), /Private backend/);
    await page.evaluate(() => window.presenceReject = false);
    await card.locator('.retry').click();
    await page.waitForFunction(() => !document.querySelector('#presence-test')._loading);
    assert.equal(await card.locator('.retry').count(), 0);
    assert.equal(await card.locator('.person').first().locator('.fact').nth(1).locator('dd').innerText(), '1');
    await page.evaluate(() => {
      const card = document.querySelector('#presence-test');
      window.presenceHass = { ...window.presenceHass, states: { ...window.presenceHass.states,
        'person.alex': { state: 'not_home', last_changed: new Date().toISOString(), attributes: { friendly_name: 'Alex' } },
      } }; card.hass = window.presenceHass;
    });
    assert.equal(await card.locator('.person').first().locator('.badge').innerText(), 'Unterwegs');
    assert.equal(await card.locator('.person').first().locator('.fact').nth(1).locator('dd').innerText(), '2');
    assert.equal(await page.evaluate(() => window.presenceCalls.length), 3, 'Live state changes must update facts without refetching');
    await page.evaluate(async () => {
      const card = document.querySelector('#presence-test'); window.presenceCard = card;
      window.presenceHass.callWS = () => new Promise(resolve => window.resolvePresence = resolve);
      card._load(); card.remove(); window.resolvePresence({}); await Promise.resolve();
    });
    assert.equal(await page.evaluate(() => window.presenceCard._loading), false);
    assert.deepEqual(errors, []);
    console.log('Presence: compact cards, Recorder facts, unknown gaps, responsive layout, live changes, retry and disconnect passed.');
  } finally { await context.close(); }
}

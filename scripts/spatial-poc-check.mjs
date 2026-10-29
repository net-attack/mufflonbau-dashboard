import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { startPoc } from './spatial-poc.mjs';
import { galaxyProfiles } from './galaxy-tab-a11.mjs';

const artifacts = new URL('../test-results/spatial-poc/', import.meta.url);
await mkdir(artifacts, { recursive: true });
const production = new URL('../mufflonbau-dashboard.js', import.meta.url);
const hash = async () => createHash('sha256').update(await readFile(production)).digest('hex');
const beforeHash = await hash();
const server = await startPoc({ port: 0 });
const browser = await chromium.launch({ headless: true, args: process.env.SPATIAL_POC_HARDWARE === '1' ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [], screenshots = [], measurements = [];
const page = await browser.newPage({ viewport: { width: 1560, height: 1100 }, deviceScaleFactor: 1 });
page.on('pageerror', e => errors.push(e.message));
const panel = id => page.locator(`.scene-card[data-renderer="${id}"]`);
const waitFrame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function ready(target) {
  await target.goto(server.url); await target.waitForFunction(() => window.spatialPoc?.ready);
  await target.evaluate(() => spatialPoc.ready);
  assert.deepEqual(await target.locator('.scene-card').evaluateAll(nodes => nodes.map(n => n.dataset.ready)), ['true', 'true', 'true']);
}
async function devicePoint(id, device = 'light') {
  return page.evaluate(({ id, device }) => {
    const p = spatialPoc.panels.find(p => p.architecture.id === id), rect = p.viewport.getBoundingClientRect();
    const point = p.point(device); return { x: rect.left + point.x, y: rect.top + point.y };
  }, { id, device });
}
async function overlayFits(id) {
  const geometry = await panel(id).evaluate(el => {
    const node = el.querySelector('.device-popup'), popup = node.getBoundingClientRect();
    const viewport = node.classList.contains('device-controls') ? {left:0,top:0,right:innerWidth,bottom:innerHeight} : el.querySelector('.viewport').getBoundingClientRect();
    return { left: popup.left - viewport.left, top: popup.top - viewport.top, right: viewport.right - popup.right, bottom: viewport.bottom - popup.bottom,
      overflow: Math.max(0,node.scrollHeight-node.clientHeight) };
  });
  assert.ok(geometry.left >= -1 && geometry.top >= -1 && geometry.right >= -1 && geometry.bottom >= -1 && geometry.overflow <= 1, `Controls must fit without internal scrolling ${id}: ${JSON.stringify(geometry)}`);
  assert.ok(await panel(id).locator('.device-popup').evaluate(el=>el.offsetWidth<=340 && el.offsetHeight<450),'Controls should fit their content, not fill the screen');
}
async function hybridAlignment() {
  const delta = await page.evaluate(() => {
    const p = spatialPoc.panels[1], hit = p.renderer.svg.hits.get('light'), point = hit.ownerSVGElement.createSVGPoint(); point.x = Number(hit.getAttribute('cx')); point.y = Number(hit.getAttribute('cy'));
    const svg = point.matrixTransform(hit.parentNode.getScreenCTM()), pixi = p.renderer.world.toGlobal({ x: point.x, y: point.y }), rect = p.viewport.getBoundingClientRect();
    return Math.hypot(svg.x - rect.left - pixi.x, svg.y - rect.top - pixi.y);
  }); assert.ok(delta < .6, `SVG/GPU alignment must survive camera and resize: ${delta}`);
}
async function sceneHoldDrag(id, device, delta) {
  await page.evaluate(({ id, device }) => {
    const p = spatialPoc.panels.find(p => p.architecture.id === id), r = p.viewport.getBoundingClientRect();
    window.scrollBy(0, r.top + p.point(device).y - innerHeight / 2);
  }, { id, device });
  const point = await devicePoint(id, device);
  await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.waitForTimeout(550);
  await page.mouse.move(point.x, point.y + delta, { steps: 8 }); await page.mouse.up();
}
try {
  await ready(page);
  assert.equal(await page.evaluate(()=>spatialPoc.view),'pixi');
  assert.ok(await page.evaluate(()=>spatialPoc.panels.every(p=>p.camera.mode==='2d')));
  await page.evaluate(()=>spatialPoc.capture(3.5));
  await panel('pixi').screenshot({path:new URL('pixi-default-2d.png',artifacts).pathname});screenshots.push('pixi-default-2d.png');
  await page.locator('[data-projection="3d"]').click();
  assert.ok(await page.evaluate(()=>spatialPoc.panels.every(p=>p.camera.mode==='3d')));
  assert.equal(await page.evaluate(()=>spatialPoc.panels[1].renderer.svg.trail),null,'Hybrid must not draw the route twice in SVG and Pixi');
  for (const theme of ['storybook', 'blueprint']) {
    await page.locator(`button[data-theme="${theme}"]`).click();
    assert.deepEqual(await page.locator('.scene-card').evaluateAll(nodes => nodes.map(n => n.dataset.theme)), [theme, theme, theme]);
    await page.locator('button[data-view="compare"]').click(); await waitFrame();
    await page.screenshot({ path: new URL(`compare-${theme}.png`, artifacts).pathname, fullPage: true }); screenshots.push(`compare-${theme}.png`);
    for (const id of ['svg', 'hybrid', 'pixi']) {
      await page.locator(`button[data-view="${id}"]`).click(); await waitFrame();
      await panel(id).screenshot({ path: new URL(`${id}-${theme}.png`, artifacts).pathname }); screenshots.push(`${id}-${theme}.png`);
    }
  }
  await page.locator('[data-theme="storybook"]').click();
  for (const id of ['svg', 'hybrid', 'pixi']) {
    await page.locator(`button[data-view="${id}"]`).click(); await panel(id).scrollIntoViewIfNeeded(); await waitFrame();
    const point = await devicePoint(id), activeBefore = await page.evaluate(() => spatialPoc.simulator.state.light.active);
    await page.mouse.click(point.x, point.y);
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.light.active), !activeBefore, `${id}: real scene hit toggles light`);
    assert.equal(new Set(await page.locator('.scene-card').evaluateAll(nodes => nodes.map(n => n.dataset.version))).size, 1, 'All renderer versions must agree');
    await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.waitForTimeout(570); await page.mouse.up();
    await panel(id).locator('.device-popup').waitFor(); await overlayFits(id);
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.light.active), !activeBefore, 'Long press must not also toggle');
    await panel(id).locator('.device-popup [data-setting="brightness"]').fill('32');
    assert.deepEqual(await page.locator('.scene-card').evaluateAll(nodes => nodes.map(n => n.dataset.brightness)), ['0.32', '0.32', '0.32']);
    await page.locator('[data-control="light.brightness"]').fill('0.7');
    await page.locator('[data-control="temperature.value"]').fill('24.3');
    assert.equal(await page.locator('.scene-readings').filter({ hasText: '24.3 °C' }).count(), 3);
    // Test overlay positioning across zoom, pan, an offscreen device and resize.
    for (const camera of [{ x: 410, y: 139, zoom: 2 }, { x: 70, y: 340, zoom: 3 }, { x: 560, y: 20, zoom: 2.8 }]) {
      await page.evaluate(({ id, camera }) => spatialPoc.panels.find(p => p.architecture.id === id).setCamera(camera), { id, camera }); await overlayFits(id);
      if (id === 'hybrid') await hybridAlignment();
    }
    await page.setViewportSize({ width: 533, height: 893 }); await waitFrame(); await overlayFits(id);
    if (id === 'hybrid') await hybridAlignment();
    await panel(id).locator('[aria-label="Details schließen"]').click(); await page.setViewportSize({ width: 1560, height: 1100 });
    await panel(id).locator('[data-zoom="reset"]').click(); await panel(id).scrollIntoViewIfNeeded(); await waitFrame();
    const vp = await panel(id).locator('.viewport').boundingBox();
    const cameraBefore = await page.evaluate(id => spatialPoc.panels.find(p => p.architecture.id === id).camera, id);
    await page.mouse.move(vp.x + vp.width / 2, vp.y + vp.height / 2); await page.keyboard.down('Control'); await page.mouse.wheel(0, -80); await page.keyboard.up('Control');
    await waitFrame(); assert.ok(await page.evaluate(id => spatialPoc.panels.find(p => p.architecture.id === id).camera.zoom, id) > cameraBefore.zoom);
    const lightBeforeDrag = await page.evaluate(() => spatialPoc.simulator.state.light.active);
    const lamp = await devicePoint(id); await page.mouse.move(lamp.x, lamp.y); await page.mouse.down(); await page.mouse.move(lamp.x + 45, lamp.y + 30, { steps: 6 }); await page.mouse.up();
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.light.active), lightBeforeDrag, 'Drag must not toggle');
    await panel(id).locator('[data-zoom="reset"]').click();
    await panel(id).scrollIntoViewIfNeeded();await waitFrame();
    const orbitBox=await panel(id).locator('.viewport').boundingBox();
    const orbitBefore=await page.evaluate(id=>({...spatialPoc.panels.find(p=>p.architecture.id===id).camera}),id);
    const lightBeforeOrbit=await page.evaluate(()=>spatialPoc.simulator.state.light.active);
    await page.mouse.move(orbitBox.x+orbitBox.width/2,orbitBox.y+orbitBox.height/2);await page.mouse.down({button:'right'});
    await page.mouse.move(orbitBox.x+orbitBox.width/2+60,orbitBox.y+orbitBox.height/2,{steps:8});await page.mouse.up({button:'right'});
    const orbitAfter=await page.evaluate(id=>({...spatialPoc.panels.find(p=>p.architecture.id===id).camera}),id);
    assert.ok(orbitAfter.angle<orbitBefore.angle-.4,'Rightward secondary-button drag must orbit with the corrected direction');
    await page.mouse.down({button:'right'});await page.mouse.move(orbitBox.x+orbitBox.width/2,orbitBox.y+orbitBox.height/2,{steps:8});await page.mouse.up({button:'right'});
    assert.ok(Math.abs(await page.evaluate(id=>spatialPoc.panels.find(p=>p.architecture.id===id).camera.angle,id)-orbitBefore.angle)<.01,'Opposite mouse drags must restore the orbit');
    assert.equal(await page.evaluate(()=>spatialPoc.simulator.state.light.active),lightBeforeOrbit,'Orbit must never toggle a light or open its controls');
    assert.equal(await panel(id).locator('.device-popup').count(),0);
    const accessible = panel(id).locator('.accessible-devices'); await accessible.locator('summary').click();
    await accessible.locator('[data-device="light"]').focus(); await page.keyboard.press('Enter'); await panel(id).locator('.device-popup').waitFor(); await page.keyboard.press('Escape');
    assert.equal(await accessible.locator('[data-device="light"]').evaluate(el => el === document.activeElement), id === 'pixi');
    await accessible.locator('summary').click();
    for (const state of ['docked', 'idle', 'cleaning', 'paused', 'returning', 'error']) {
      await page.locator('[data-control="vacuum.state"]').selectOption(state); assert.match(await panel(id).locator('.scene-readings').innerText(), new RegExp(state));
    }
    // Mixer-style hold + vertical drag must change the value, never pan or toggle.
    const cameraBeforeFader = await page.evaluate(id => ({ ...spatialPoc.panels.find(p => p.architecture.id === id).camera }), id);
    await page.locator('[data-control="light.brightness"]').fill('0.5');
    await sceneHoldDrag(id, 'light', -34);
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.light.brightness), .7);
    assert.deepEqual(await page.evaluate(id => spatialPoc.panels.find(p => p.architecture.id === id).camera, id), cameraBeforeFader);
    await panel(id).locator('[data-setting="color"]').fill('#75aaff');
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.light.colorMode), 'rgb');
    await page.evaluate(() => spatialPoc.simulator.update({ light: { supportsColor: false } })); assert.equal(await panel(id).locator('.color-setting').isVisible(), false);
    await page.evaluate(() => spatialPoc.simulator.update({ light: { supportsColor: true } }));
    await panel(id).locator('[data-setting="colorTemperature"]').fill('2700');
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.light.colorMode), 'temperature');
    await panel(id).locator('[aria-label="Details schließen"]').click();
    const heatBefore = await page.evaluate(() => spatialPoc.simulator.state.heating.active);
    const heater = await devicePoint(id, 'heating'); await page.mouse.click(heater.x, heater.y);
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.heating.active), !heatBefore);
    await panel(id).locator('.device-popup [data-setting="targetTemperature"]').fill('21');
    await panel(id).locator('[aria-label="Details schließen"]').click();
    await sceneHoldDrag(id, 'heating', -24);
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.heating.targetTemperature), 23);
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.heating.active), !heatBefore, 'Holding the radiator must not toggle it again');
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.temperature.value), 24.3);
    await panel(id).locator('[aria-label="Details schließen"]').click();
    // A real scene hit on Saugfried opens the shared settings, not just a label.
    await page.evaluate(() => spatialPoc.simulator.update({ vacuum: { state: 'docked' } }));
    await page.evaluate(id => { const p = spatialPoc.panels.find(p => p.architecture.id === id), r = p.viewport.getBoundingClientRect(); window.scrollBy(0, r.top + p.point('vacuum').y - innerHeight / 2); }, id);
    const robot = await devicePoint(id, 'vacuum');
    await page.mouse.click(robot.x, robot.y); await panel(id).locator('[data-setting="suction"]').selectOption('turbo');
    await panel(id).locator('[data-setting="mode"]').selectOption('mop');
    await panel(id).locator('[data-device-action="vacuum-cleaning"]').click();
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.vacuum.state), 'cleaning');
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.vacuum.suction), 'turbo');
    await panel(id).locator('[data-device-action="vacuum-paused"]').click();
    assert.equal(await page.evaluate(() => spatialPoc.simulator.state.vacuum.state), 'paused');
    await panel(id).locator('[aria-label="Details schließen"]').click();
    if (id === 'hybrid') await hybridAlignment();
  }
  // Discrete visual changes must reach every backend as well as shared labels.
  await page.locator('button[data-view="compare"]').click();
  for (const [control, value] of [['window.state', 'closed'], ['dehumidifier.state', 'off']]) await page.locator(`[data-control="${control}"]`).selectOption(value);
  await page.locator('[data-control="heating.active"]').uncheck(); await page.locator('[data-control="light.colorTemperature"]').fill('6500');
  assert.equal(new Set(await page.locator('.scene-card').evaluateAll(nodes => nodes.map(n => n.dataset.version))).size, 1);
  await page.evaluate(() => spatialPoc.simulator.preset('demo'));
  // Hardware-dependent observations, never performance thresholds in CI.
  await page.mouse.move(0, 0);
  for (const view of ['svg', 'hybrid', 'pixi', 'compare']) {
    await page.locator(`button[data-view="${view}"]`).click();
    for (const preset of ['idle', 'demo']) {
      await page.evaluate(preset => spatialPoc.simulator.preset(preset), preset); await page.waitForTimeout(200);
      const before = await page.evaluate(() => {
        for (const p of spatialPoc.panels) p.frames = p.duration = 0;
        return { time: performance.now(), counts: spatialPoc.panels.map(p => p.totalCalls) };
      });
      await page.waitForTimeout(1200);
      const sample = await page.evaluate(({ before, view, preset }) => {
        const elapsed = (performance.now() - before.time) / 1000;
        return { view, preset, elapsed, renderers: spatialPoc.panels.map((p, i) => ({ id: p.architecture.id, countDelta: p.totalCalls - before.counts[i], ...p.sample(elapsed) })) };
      }, { before, view, preset });
      if (preset === 'idle') assert.ok(sample.renderers.every(r => r.countDelta === 0), `Idle must not redraw: ${JSON.stringify(sample)}`);
      // Each retained Pixi renderer owns one GC scheduler listener. They do not
      // redraw, but are deliberately reported as residual idle housekeeping.
      for (const renderer of sample.renderers.filter(r => r.id !== 'svg')) { assert.equal(renderer.tickerStarted, false); assert.equal(renderer.systemTickerListeners, 2); }
      if (view !== 'compare') assert.ok(sample.renderers.filter(r => r.id !== view).every(r => r.countDelta === 0), 'Focused mode must stop inactive renderers');
      measurements.push(sample);
    }
  }
  console.log('Desktop scenes, shared state, overlays, gestures and idle measurements passed.');
  await writeFile(new URL('measurements.json', artifacts), JSON.stringify({ capturedAt: new Date().toISOString(), environment: { browser: browser.version(), headless: true, forcedSoftwareRenderer: process.env.SPATIAL_POC_HARDWARE !== '1' }, productionSha256: beforeHash, measurements }, null, 2));
  // Actual touch pinch and touch long press, including cancellation.
  for (const profile of galaxyProfiles) {
    const context = await browser.newContext({ ...profile.options, viewport: { width: profile.viewports[0].width, height: profile.viewports[0].height } });
    const touch = await context.newPage(); touch.on('pageerror', e => errors.push(e.message)); await ready(touch); await touch.evaluate(() => spatialPoc.capture());
    const client = await context.newCDPSession(touch);
    for (const id of ['svg', 'hybrid', 'pixi']) {
      await touch.locator(`button[data-view="${id}"]`).click(); const card = touch.locator(`[data-renderer="${id}"]`); await card.scrollIntoViewIfNeeded();
      const bounds = await card.locator('.viewport').boundingBox(), x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: x - 35, y }, { id: 2, x: x + 35, y }] });
      for (const distance of [45, 60, 80]) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x - distance, y }, { id: 2, x: x + distance, y }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.ok(await touch.evaluate(id => spatialPoc.panels.find(p => p.architecture.id === id).camera.zoom, id) > 1.5);
      await card.locator('[data-zoom="reset"]').click();
      await card.scrollIntoViewIfNeeded();
      const rotationBounds = await card.locator('.viewport').boundingBox(), cx = rotationBounds.x + rotationBounds.width / 2, cy = rotationBounds.y + rotationBounds.height / 2;
      const angleBefore = await touch.evaluate(id => spatialPoc.panels.find(p => p.architecture.id === id).camera.angle, id);
      await client.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{id:1,x:cx-45,y:cy},{id:2,x:cx+45,y:cy}] });
      for (const angle of [.15,.3,.55]) await client.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{id:1,x:cx-45*Math.cos(angle),y:cy-45*Math.sin(angle)},{id:2,x:cx+45*Math.cos(angle),y:cy+45*Math.sin(angle)}]});
      await client.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
      assert.ok(Math.abs(await touch.evaluate(id => spatialPoc.panels.find(p => p.architecture.id === id).camera.angle,id)-angleBefore)>.4, 'Two-finger twist must rotate the actual scene');
      await card.locator('[data-zoom="reset"]').click();
      // Clicking the toolbar can scroll a tall card so the lamp is above the
      // visible screen. Bring the actual device, not the whole card, into view.
      await touch.evaluate(id => {
        const p = spatialPoc.panels.find(p => p.architecture.id === id), r = p.viewport.getBoundingClientRect();
        window.scrollBy(0, r.top + p.point('light').y - innerHeight / 2);
      }, id);
      const lamp = await touch.evaluate(id => { const p = spatialPoc.panels.find(p => p.architecture.id === id), r = p.viewport.getBoundingClientRect(), point = p.point('light'); return { x: r.left + point.x, y: r.top + point.y }; }, id);
      const active = await touch.evaluate(() => spatialPoc.simulator.state.light.active);
      await touch.evaluate(() => spatialPoc.simulator.update({light:{brightness:.5}}));
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...lamp }] }); await touch.waitForTimeout(550);
      await client.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{id:1,x:lamp.x,y:lamp.y-34}]});
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await card.locator('.device-popup').waitFor(); assert.equal(await touch.evaluate(() => spatialPoc.simulator.state.light.active), active);
      assert.equal(await touch.evaluate(()=>spatialPoc.simulator.state.light.brightness),.7);
      assert.ok(await card.locator('.device-popup').evaluate(el=>el.scrollHeight<=el.clientHeight+1),'Touch controls must have no internal scrollbar');
      await card.locator('[aria-label="Details schließen"]').click();
    }
    for (const viewport of profile.viewports) {
      await touch.setViewportSize({ width: viewport.width, height: viewport.height }); await touch.locator('button[data-view="compare"]').click();
      assert.ok(await touch.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1);
      const file = `tablet-${profile.name}-${viewport.name}.png`; await touch.screenshot({ path: new URL(file, artifacts).pathname, fullPage: true }); screenshots.push(file);
    }
    await context.close();
  }
  assert.deepEqual(errors, []); assert.equal(await hash(), beforeHash, 'Dev build must not alter production bundle');
  await writeFile(new URL('measurements.json', artifacts), JSON.stringify({ capturedAt: new Date().toISOString(), environment: { browser: browser.version(), headless: true, forcedSoftwareRenderer: process.env.SPATIAL_POC_HARDWARE !== '1' }, productionSha256: beforeHash, measurements }, null, 2));
  await writeFile(new URL('index.html', artifacts), `<!doctype html><html lang="de"><meta charset="utf-8"><title>Spatial Lab · Galerie</title><style>body{font:16px system-ui;background:#eee9dc;color:#344a40;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}figure{margin:0}img{width:100%;border-radius:12px}a{color:inherit}</style><h1>Spatial Lab · gleiche Szene, sechs Varianten</h1><p>Licht 70 %, 2700 K · Wärme 60 % · 22.1 °C · 64 % · Entfeuchter läuft · Saugfried cleaning · Fenster offen · t=3.5 s. Headless-Screenshots; GPU-Messungen verwenden standardmäßig SwiftShader.</p><p><a href="measurements.json">Messdaten</a> · <a href="bundle-sizes.json">Buildgrößen</a></p><main>${screenshots.map(file => `<figure><a href="${file}"><img src="${file}" loading="lazy" alt="${file}"></a><figcaption>${file}</figcaption></figure>`).join('')}</main></html>`);
  console.log(`Spatial POC passed: shared state, both themes, real SVG/Pixi hits, click/hold/drag/pinch, anchored overlays, resize, keyboard access, idle/focus scheduling, unchanged production bundle; ${screenshots.length} screenshots. Measurements: test-results/spatial-poc/measurements.json`);
} finally { await browser.close(); await server.close(); }

import assert from 'node:assert/strict';
import { galaxyProfiles } from './galaxy-tab-a11.mjs';
import { previewConfig, previewHass } from './preview-fixture.mjs';

export async function checkFloorplan(page) {
  await page.evaluate(async ({config,hass})=>{
    window.mapCalls=[]; window.mapMoreInfo=[];
    window.mapHass={...hass,callService:async(...args)=>window.mapCalls.push(args)};
    document.addEventListener('hass-more-info',e=>window.mapMoreInfo.push(e.detail.entityId));
    const result=await customElements.get('ll-strategy-dashboard-mufflonbau').generate(config,window.mapHass);
    window.mapConfig=result.views.find(v=>v.path==='rooms').cards[0].cards.find(c=>c.mode==='floorplan');
    const card=document.createElement('mufflonbau-live'); card.id='interactive-test'; card.setConfig(window.mapConfig); card.hass=window.mapHass;
    document.querySelector('main').replaceChildren(card);
  },{config:previewConfig,hass:previewHass});
  const card=page.locator('#interactive-test');
  assert.equal(await card.locator('.map-room-label').count(),6);
  assert.match(await card.locator('.room-value').first().textContent(),/21,1 °C · 61,1 %/);
  // A room without sensors is intentional, not a pair of broken readings.
  await page.evaluate(()=>{
    window.mapConfig={...window.mapConfig,rooms:window.mapConfig.rooms.map(room=>room.id==='hall'?{...room,temperature:undefined,humidity:undefined}:room)};
    document.querySelector('#interactive-test').setConfig(window.mapConfig);
  });
  assert.equal(await card.locator('[data-room-label=hall] .room-value').count(),0);
  assert.equal(await card.locator('[data-room-label=hall] .room-name').textContent(),'Flur');
  for (const only of ['temperature','humidity']) {
    await page.evaluate(only=>{
      const config={...window.mapConfig,rooms:window.mapConfig.rooms.map(room=>room.id==='living'?{...room,[only==='temperature'?'humidity':'temperature']:undefined}:room)};
      document.querySelector('#interactive-test').setConfig(config);
    },only);
    assert.equal(await card.locator('[data-room-label=living] .room-value').textContent(),only==='temperature'?'21,1 °C':'61,1 %');
  }
  await page.evaluate(()=>document.querySelector('#interactive-test').setConfig(window.mapConfig));
  await card.locator('[data-marker=living-lamp]').click();
  assert.equal(await page.evaluate(()=>window.mapCalls.length),0,'Selecting a marker must not toggle a light');
  await card.locator('.map-device-detail button').filter({hasText:'Ausschalten'}).click();
  assert.deepEqual(await page.evaluate(()=>window.mapCalls[0]),['homeassistant','toggle',{}, {entity_id:'light.living'}]);
  await card.locator('[data-marker=window]').click();
  assert.match(await card.locator('.map-device-detail').innerText(),/Fenster geschlossen/);
  await page.evaluate(()=>{window.mapHass={...window.mapHass,states:{...window.mapHass.states,'binary_sensor.window':{state:'on',attributes:{}}}}; document.querySelector('#interactive-test').hass=window.mapHass;});
  assert.match(await card.locator('.map-device-detail').innerText(),/Fenster offen/);
  await card.locator('.map-device-detail button').filter({hasText:'Details ansehen'}).click();
  assert.equal(await page.evaluate(()=>window.mapMoreInfo.at(-1)),'binary_sensor.window');
  await card.locator('[data-marker=unassigned]').click();
  assert.match(await card.locator('.map-device-detail').innerText(),/Noch nicht eingerichtet/);
  assert.equal(await card.locator('.map-device-detail button').count(),1);
  await card.locator('.map-toolbar select').selectOption('office');
  assert.equal(await card.locator('[data-marker]').count(),2);
  const cropped=await card.locator('.floor-map').getAttribute('viewBox');
  await card.locator('.map-toolbar select').selectOption('');
  assert.notEqual(await card.locator('.floor-map').getAttribute('viewBox'),cropped);
  await card.locator('[data-marker=living-lamp]').click();
  await page.evaluate(()=>{window.mapHass={...window.mapHass,states:{...window.mapHass.states,'light.living':{state:'unavailable',attributes:{}}}}; document.querySelector('#interactive-test').hass=window.mapHass;});
  assert.equal(await card.locator('.map-device-detail button').first().isDisabled(),true);
  assert.match(await card.locator('.map-device-detail').innerText(),/Wandschalter möglicherweise aus/);
  assert.equal(await card.locator('[data-marker=living-lamp] .wall-switched').count(),1);
  assert.equal(await card.locator('[data-marker=living-lamp] .unavailable').count(),0);
  await page.evaluate(()=>{window.mapHass={...window.mapHass,states:{...window.mapHass.states,'sensor.outdoor':{state:'unavailable',attributes:{}}}}; document.querySelector('#interactive-test').hass=window.mapHass;});
  await card.locator('[data-marker=outdoor]').click();
  assert.match(await card.locator('.map-device-detail').innerText(),/In Home Assistant nicht verfügbar/);
  assert.doesNotMatch(await card.locator('.map-device-detail').innerText(),/Wandschalter/);
  await card.locator('[data-marker=living-lamp]').click();
  await page.evaluate(()=>{window.mapHass={...window.mapHass,states:{...window.mapHass.states,'light.living':{state:'off',attributes:{}}},callService:async()=>{throw new Error('Offline')}}; document.querySelector('#interactive-test').hass=window.mapHass;});
  assert.equal(await card.locator('[data-marker=living-lamp] .wall-switched').count(),0);
  await card.locator('.map-device-detail button').filter({hasText:'Einschalten'}).click();
  assert.match(await card.locator('.map-device-detail').innerText(),/fehlgeschlagen/);
  await card.locator('.map-device-detail button').filter({hasText:'Schließen'}).click();
  for(const mode of ['ambient','night']) for(const profile of galaxyProfiles) for(const viewport of profile.viewports) {
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await page.evaluate(mode=>{ const card=document.querySelector('#interactive-test'); card.setConfig({...window.mapConfig,appearance:{theme:'storybook',mode}}); card.hass=window.mapHass;},mode);
    const geometry=await card.evaluate(card=>{
      const svg=card.shadowRoot.querySelector('.floor-map'); const view=svg.viewBox.baseVal;
      const colors=getComputedStyle(card.shadowRoot.querySelector('ha-card'));
      const rgb=value=>{const n=value.trim().replace('#','');return [0,2,4].map(i=>parseInt(n.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)};
      const luminance=v=>{const [r,g,b]=rgb(v); return .2126*r+.7152*g+.0722*b};
      const lum=[luminance(colors.getPropertyValue('--mb-ink')),luminance(colors.getPropertyValue('--mb-map-floor'))].sort((a,b)=>b-a);
      const frame=card.shadowRoot.querySelector('.map-viewport').getBoundingClientRect(); const drawing=svg.getBoundingClientRect();
      return {fits:drawing.top>=frame.top-1 && drawing.bottom<=frame.bottom+1,contrast:(lum[0]+.05)/(lum[1]+.05),outside:[...svg.querySelectorAll('[data-marker] circle')].filter(n=>+n.getAttribute('cx')-14<view.x || +n.getAttribute('cx')+14>view.x+view.width || +n.getAttribute('cy')-14<view.y || +n.getAttribute('cy')+14>view.y+view.height).length,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.equal(geometry.outside,0); assert.ok(geometry.fits,'The unzoomed map must not be clipped by its scrolling viewport'); assert.ok(geometry.overflow<=1); assert.ok(geometry.contrast>=4.5,JSON.stringify({mode,geometry}));
    await page.screenshot({path:`test-results/interactive-map-${mode}-${profile.name}-${viewport.name}.png`});
  }
  await card.locator('.map-device-list summary').click();
  assert.ok(await card.locator('.map-device-list button').first().evaluate(b=>b.getBoundingClientRect().height>=44));
  await card.locator('.map-toolbar button[aria-label=Vergrößern]').click();
  assert.equal(await card.locator('.floor-map').evaluate(svg=>svg.style.width),'150%');
  await card.locator('.map-toolbar button[aria-label="Zoom zurücksetzen"]').click();
  console.log('Interactive map: controls, live contact, unknown entities, climate, outside markers and tablet layouts passed.');
}

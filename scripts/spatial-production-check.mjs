import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {spatialFixture,spatialHass} from './spatial-fixture.mjs';
export async function checkSpatial(page,{spatial=spatialFixture,hass=spatialHass,output='test-results/spatial-production',privatePreview=false}={}){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await mkdir(output,{recursive:true});
 await page.evaluate(async({spatial,hass})=>{
  window.spatialCalls=[];window.spatialLiveHass={...hass,callService:async(...args)=>window.spatialCalls.push(args)};
  const card=document.createElement('mufflonbau-spatial');card.id='spatial-production';card.style.cssText='display:block;height:calc(100dvh - 30px);min-height:0';card.setConfig({spatial,language:'de',appearance:{theme:'storybook'},fallback:{rooms:[]}});card.hass=window.spatialLiveHass;document.querySelector('main').replaceChildren(card);
 },{spatial,hass});
 const card=page.locator('#spatial-production');await card.locator('canvas').waitFor({timeout:30000});await page.waitForFunction(()=>document.querySelector('#spatial-production').dataset.ready==='true');
 assert.equal(await card.evaluate(c=>c.camera.mode),'2d');
 const scenes=[spatial.scenes[0].id,...(spatial.focus_rooms??[]).map(s=>s.id)];
 for(const id of scenes){await card.locator(`[data-scene="${id}"]`).click();assert.equal(await card.evaluate(c=>c.scene.id),spatial.scenes[0].id,'Focus keeps one whole-apartment scene');for(const mode of spatial.enable_3d?['2d','3d']:['2d']){await card.locator(`[data-projection="${mode}"]`).click();assert.ok(await card.locator('.sensor-frame').count()>0);assert.equal(await card.locator('canvas').count(),1);await card.screenshot({path:`${output}/${id}-${mode}.png`});}}
 if(privatePreview){assert.deepEqual(errors,[]);console.log('Private live-data preview:',scenes.length,'scenes in 2D/3D; no service calls.');return;}
 await card.locator('[data-scene=living]').click();await card.locator('[data-projection="2d"]').click();await card.locator('[aria-label="Karte zurücksetzen"]').click();
 const point=async id=>card.evaluate((c,id)=>{const r=c.viewport.getBoundingClientRect(),p=c.point(c.scene.devices.find(d=>d.id===id));return {x:r.left+p.x,y:r.top+p.y};},id);
 let p=await point('lamp');await page.mouse.click(p.x,p.y);assert.equal(await page.evaluate(()=>spatialCalls.at(-1)[1]),'turn_off');
 assert.equal(await card.evaluate(c=>c._hass.states['light.spatial_lamp'].state),'on','Commands do not fabricate confirmed device state');
 await page.mouse.move(p.x,p.y);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();await card.locator('[data-setting=brightness]').fill('42');await card.locator('[data-setting=brightness]').dispatchEvent('change');
 assert.equal(await page.evaluate(()=>spatialCalls.at(-1)[2].brightness_pct),42);
 await card.locator('[aria-label="Details schließen"]').click();
 await card.locator('.devices summary').click();await card.locator('[data-device=ambilight]').click();await card.locator('[data-setting=color]').fill('#3366ff');await card.locator('[data-setting=color]').dispatchEvent('change');assert.equal(await page.evaluate(()=>spatialCalls.at(-1)[3].entity_id),'light.spatial_ambilight');
 await card.locator('[aria-label="Details schließen"]').click();await card.locator('[data-device=outlet]').click();assert.match(await card.locator('.popup-state').textContent(),/0 W/);
 const count=await page.evaluate(()=>spatialCalls.length);await card.locator('[data-intent=toggle]').click();await card.locator('[data-confirm=cancel]').click();assert.equal(await page.evaluate(()=>spatialCalls.length),count);
 await card.locator('[data-intent=toggle]').click();await card.locator('[data-confirm=accept]').click();await page.waitForFunction(()=>spatialCalls.at(-1)[0]==='switch');assert.equal(await page.evaluate(()=>spatialCalls.at(-1)[1]),'turn_off');
 await page.evaluate(()=>{spatialLiveHass={...spatialLiveHass,states:{...spatialLiveHass.states,'switch.spatial_outlet':{state:'off',attributes:{}}}};document.querySelector('#spatial-production').hass=spatialLiveHass;});
 await card.locator('[data-intent=toggle]').click();assert.match(await card.locator('.confirm').textContent(),/einschalten/);await card.locator('[data-confirm=accept]').click();await page.waitForFunction(()=>spatialCalls.at(-1)[1]==='turn_on'&&spatialCalls.at(-1)[0]==='switch');
 await card.locator('[aria-label="Details schließen"]').click();await card.locator('[data-device=heater]').click();await card.locator('[data-setting=temperature]').fill('23');await card.locator('[data-setting=temperature]').dispatchEvent('change');assert.equal(await page.evaluate(()=>spatialCalls.at(-1)[2].temperature),23);
 await card.locator('[aria-label="Details schließen"]').click();
 await page.evaluate(()=>{spatialLiveHass={...spatialLiveHass,states:{...spatialLiveHass.states,'light.spatial_lamp':{state:'unavailable',attributes:{}}}};document.querySelector('#spatial-production').hass=spatialLiveHass;});
 await card.locator('[data-device=lamp]').click();assert.match(await card.locator('.popup-state').textContent(),/nicht verfügbar/);assert.equal(await card.locator('[data-intent=toggle]').isDisabled(),true);await card.locator('[aria-label="Details schließen"]').click();
 for(const viewport of [{width:893,height:533},{width:533,height:893},{width:390,height:844}]){
  await page.setViewportSize(viewport);await card.locator('[data-projection="2d"]').click();await card.locator('[data-device=outlet]').click();
  const box=await card.locator('.popup').evaluate(n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,overflow:n.scrollHeight-n.clientHeight};});assert.ok(box.left>=0&&box.top>=0&&box.right<=viewport.width&&box.bottom<=viewport.height&&box.overflow<=1,JSON.stringify(box));
  await card.locator('[aria-label="Details schließen"]').click();await page.screenshot({path:`output-${viewport.width}.png`.replace('output-',`${output}/responsive-`)});
 }
 const idleBefore=await card.evaluate(c=>{const original=c.renderer.frame.bind(c.renderer);c.renderCount=0;c.renderer.frame=t=>{c.renderCount++;return original(t);};return c.renderCount;});await page.waitForTimeout(350);assert.equal(await card.evaluate(c=>c.renderCount),idleBefore,'Idle does not submit frames');
 await card.evaluate(c=>{c.remove();});assert.deepEqual(errors,[]);console.log('Production spatial: all scenes, 2D/3D, live HA state, per-device commands, outlet confirmation/cancel, sensors, mobile overlays, idle and teardown passed.');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const server=createServer(async(req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?await readFile(new URL('../mufflonbau-dashboard.js',import.meta.url)):'<!doctype html><meta charset="utf-8"><style>body{margin:12px;background:#eee9dc}main{height:calc(100dvh - 24px)}</style><main></main>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.addScriptTag({url:'/bundle.js'});
 if(process.env.SPATIAL_PRIVATE_PREVIEW){const config=JSON.parse(await readFile('debug/spatial-production-prepared.local.json','utf8')),states=JSON.parse(await readFile('debug/spatial-live-states.local.json','utf8'));await checkSpatial(page,{spatial:config.strategy.floorplan_spatial,hass:{...spatialHass,states},output:'private_/spatial-poc/production',privatePreview:true});}
 else await checkSpatial(page);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {deviceState,command,perform,validateSpatial} from '../src/spatial/state.js';
import {matrix,project,unproject} from '../src/spatial/camera.js';
import {geometry,sensorAnchor} from '../src/spatial/geometry.js';
import {palettes} from '../src/spatial/palette.js';
import {spatialFixture,spatialHass} from '../scripts/spatial-fixture.mjs';
import {collectEntities,normalizeConfig} from '../src/core/config.js';
import {generateDashboard} from '../src/strategy.js';
const scene=spatialFixture.scenes[0],lamp=scene.devices[0],outlet=scene.devices.find(d=>d.id==='outlet');
test('production scene config is optional, validates geometry and reaches all room routes',()=>{
 validateSpatial(spatialFixture);assert.ok(collectEntities(normalizeConfig({floorplan_spatial:spatialFixture})).includes('sensor.spatial_energy'));assert.throws(()=>validateSpatial({scenes:[]}),/1–30/);
 assert.throws(()=>validateSpatial({scenes:[{...scene,devices:[{id:'bad',entity:'javascript:evil',x:2,y:3}]}]}),/entity/);
 const rooms=spatialFixture.focus_rooms.map(s=>({id:s.id,name:s.label,lights:['light.spatial_lamp']}));
 const dashboard=generateDashboard({rooms,floorplan_spatial:spatialFixture},spatialHass);
 assert.equal(dashboard.views.find(v=>v.path==='rooms').cards[0].cards[0].type,'custom:mufflonbau-spatial');
 for(const r of rooms)assert.ok(!dashboard.views.find(v=>v.path==='room-'+r.id).cards[0].cards.some(c=>c.type==='custom:mufflonbau-spatial'));
 assert.equal(generateDashboard({rooms},spatialHass).views.find(v=>v.path==='rooms').cards[0].cards[0].type,'custom:mufflonbau-live');
});
test('live status respects zeroes, unavailable, unknown and supported light modes',()=>{
 assert.equal(deviceState(outlet,spatialHass.states).power,0);
 assert.equal(deviceState(lamp,{}).status,'missing');
 const states=structuredClone(spatialHass.states);states[lamp.entity].state='unavailable';assert.equal(command(lamp,states,{type:'toggle'}),null);
 states[lamp.entity].state='unknown';assert.equal(deviceState(lamp,states).status,'unknown');
 states[lamp.entity]={state:'on',attributes:{supported_color_modes:['brightness']}};
 assert.equal(command(lamp,states,{type:'color',value:'#ffffff'}),null);assert.equal(command(lamp,states,{type:'kelvin',value:3000}),null);
 assert.equal(command(lamp,states,{type:'brightness',value:150}).data.brightness_pct,100);
});
test('outlets always ask for each on/off action and cancellation never calls HA',async()=>{
 const calls=[],hass={...structuredClone(spatialHass),callService:async(...args)=>calls.push(args)};let confirmations=0;
 assert.equal(await perform(hass,outlet,{type:'toggle'},async()=>{confirmations++;return false;}),false);assert.equal(calls.length,0);
 await perform(hass,outlet,{type:'toggle'},async on=>{confirmations++;assert.equal(on,false);return true;});
 assert.deepEqual(calls[0],['switch','turn_off',{}, {entity_id:outlet.entity}]);
 hass.states[outlet.entity].state='off';await perform(hass,outlet,{type:'toggle'},async on=>{confirmations++;assert.equal(on,true);return true;});assert.equal(calls[1][1],'turn_on');assert.equal(confirmations,3);
});
test('confirmed outlet action is explicit and device failure does not fabricate state',async()=>{
 const hass={...structuredClone(spatialHass),callService:async()=>{throw new Error('offline');}};
 await assert.rejects(perform(hass,outlet,{type:'toggle'},async()=>true),/offline/);assert.equal(hass.states[outlet.entity].state,'on');
 let sent;hass.callService=async(...args)=>{sent=args;};await perform(hass,outlet,{type:'toggle'},async()=>{hass.states[outlet.entity].state='off';return true;});assert.equal(sent[1],'turn_off');
});
test('each device action targets its own entity and climate setpoints preserve sensor readings',()=>{
 const heater=scene.devices.find(d=>d.id==='heater');assert.equal(command(heater,spatialHass.states,{type:'temperature',value:22.7}).data.temperature,22.5);
 assert.equal(spatialHass.states['sensor.spatial_temperature'].state,'22.1');
 assert.equal(command(lamp,spatialHass.states,{type:'brightness',value:70}).target.entity_id,lamp.entity);
 assert.equal(command(scene.devices[1],spatialHass.states,{type:'color',value:'#00aaff'}).target.entity_id,'light.spatial_ambilight');
});
test('2D ignores elevation, 3D places environmental frames on camera-visible walls',()=>{
 for(const mode of ['2d','3d'])for(const angle of [0,.6,2.1,4.2]){
  const camera={x:300,y:210,zoom:1,mode,angle},m=matrix(1000,700,camera),p={x:200,y:150},q=unproject(project(p,m),m);assert.ok(Math.hypot(q.x-p.x,q.y-p.y)<1e-8);
  const anchor=sensorAnchor(scene,camera);assert.equal(anchor.z>0,mode==='3d');
  const objects=geometry(scene,spatialHass.states,palettes.storybook,camera);assert.ok(objects.every(o=>o.shapes.every(s=>!s.points||s.points.every(p=>p.every(Number.isFinite)))));
  if(mode==='2d')assert.deepEqual(project({...p,z:99},m),project(p,m));
 }
});

test('heater hit testing includes the full object silhouette beyond its centre target',async()=>{
 const {geometryHit}=await import('../src/spatial/hit-test.js');
 const m=matrix(1000,700,{x:300,y:210,zoom:1,mode:'2d',angle:0});
 const shapes=[{type:'rect',x:280,y:80,w:80,h:15,r:0,fill:'#ffffff',stroke:'#000000',sw:1}];
 assert.equal(geometryHit(project({x:282,y:85},m),shapes,m),true);
 assert.equal(geometryHit(project({x:358,y:90},m),shapes,m),true);
 assert.equal(geometryHit(project({x:390,y:90},m),shapes,m),false);
});

test('an appliance drawing preserves its outlet state and confirms both power directions',async()=>{
 const printer={id:'printer',entity:'switch.spatial_outlet',type:'appliance'};
 assert.equal(deviceState(printer,spatialHass.states).active,true);
 assert.equal(command(printer,spatialHass.states,{type:'toggle'}).service,'turn_off');
 assert.equal(command(printer,spatialHass.states,{type:'toggle'}).confirm,true);
 const states={...spatialHass.states,[printer.entity]:{state:'off',attributes:{}}};
 assert.equal(command(printer,states,{type:'toggle'}).service,'turn_on');
});

test('dashboard shortcuts accept local routes and reject external or malformed destinations',()=>{
 const fixture=structuredClone(spatialFixture),s=fixture.scenes[0];
 s.devices.push({id:'local-board',name:'Board',type:'navigation',x:180,y:300,navigation:{view:'admin'}});validateSpatial(fixture);
 s.devices.at(-1).navigation={path:'/example-platform'};validateSpatial(fixture);
 for(const navigation of [{path:'https://example.com'},{path:'//example.com'},{path:'/one//two'},{view:'../../other'},{view:'admin',path:'/other'}]){s.devices.at(-1).navigation=navigation;assert.throws(()=>validateSpatial(fixture),/local dashboard/);}
});

test('measurement-only appliances have no writable switch target',async()=>{
 const fridge={id:'fridge',entity:'sensor.spatial_power',type:'appliance',power:'sensor.spatial_power',energy:'sensor.spatial_energy'};
 let calls=0;const hass={...spatialHass,callService:async()=>{calls++;}};
 assert.equal(deviceState(fridge,hass.states).power,0);assert.equal(command(fridge,hass.states,{type:'toggle'}),null);
 assert.equal(await perform(hass,fridge,{type:'toggle'},async()=>true),false);assert.equal(calls,0);
});

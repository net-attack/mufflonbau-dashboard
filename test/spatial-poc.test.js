import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulator, initialState, isAnimating, vacuumPosition, vacuumTrail, lightColor, heldFaderValue } from '../src/dev/spatial-poc/shared/model.js';
import { matrix, project, unproject, zoomAt, rotateAt, placeOverlay } from '../src/dev/spatial-poc/shared/camera.js';
import { palettes } from '../src/dev/spatial-poc/shared/themes.js';
import { drawing } from '../src/dev/spatial-poc/shared/drawing.js';
import { isometricDrawing } from '../src/dev/spatial-poc/shared/isometric.js';
import { windowGeometry } from '../src/dev/spatial-poc/shared/windows.js';
import { emitterMatrix } from '../src/dev/spatial-poc/shared/emission.js';
import { lift } from '../src/dev/spatial-poc/shared/camera.js';

test('one authoritative simulator broadcasts identical revisions to all renderer subscribers', () => {
  const simulator = createSimulator(), observed = [[], [], []];
  const unsub = observed.map(log => simulator.subscribe((state, version) => log.push({ state, version })));
  simulator.dispatch({ type: 'toggle-light' }); simulator.dispatch({ type: 'brightness', value: .32 });
  simulator.update({ theme: 'blueprint' });
  assert.deepEqual(observed[0], observed[1]); assert.deepEqual(observed[1], observed[2]);
  assert.equal(simulator.state.light.active, false); assert.equal(simulator.state.light.brightness, .32);
  assert.equal(simulator.state.light.colorTemperature, 2700); assert.equal(simulator.state.theme, 'blueprint');
  assert.equal(initialState.light.active, true, 'A simulator must not mutate its seed');
  unsub.forEach(fn => fn()); simulator.update({ theme: 'storybook' }); assert.equal(observed[0].length, 4);
});
test('forward/inverse camera conversion and cursor-anchored zoom agree at different sizes', () => {
  for (const [width, height] of [[440, 330], [1000, 610], [340, 320]]) {
    const camera = { x: 290, y: 175, zoom: 1.7 }, point = { x: 410, y: 139 };
    const m = matrix(width, height, camera), pixel = project(point, m), roundtrip = unproject(pixel, m);
    assert.ok(Math.abs(point.x - roundtrip.x) < 1e-8); assert.ok(Math.abs(point.y - roundtrip.y) < 1e-8);
    const zoomed = zoomAt(camera, 1.4, pixel, width, height), anchor = project(point, matrix(width, height, zoomed));
    assert.ok(Math.abs(pixel.x - anchor.x) < 1e-8); assert.ok(Math.abs(pixel.y - anchor.y) < 1e-8);
  }
});
test('device overlays flip and clamp at all viewport edges, including offscreen anchors', () => {
  for (const viewport of [{ width: 320, height: 280 }, { width: 1000, height: 610 }]) {
    for (const anchor of [{ x: 1, y: 1 }, { x: viewport.width - 1, y: viewport.height - 1 }, { x: -100, y: 400 }, { x: 2000, y: -300 }]) {
      const p = placeOverlay(anchor, viewport, { width: 236, height: 190 });
      assert.ok(p.x >= 10 && p.y >= 10); assert.ok(p.x + p.width <= viewport.width - 10);
      assert.ok(p.y + 190 <= viewport.height - 10); assert.ok(p.anchorX >= 10 && p.anchorX <= viewport.width - 10);
    }
  }
});
test('theme vocabulary stays consistent and light warmth is independent of palette', () => {
  assert.deepEqual(Object.keys(palettes.storybook).sort(), Object.keys(palettes.blueprint).sort());
  const state = structuredClone(initialState), warm = lightColor(state);
  state.light.colorTemperature = 6500; assert.notEqual(lightColor(state), warm);
  const cool = lightColor(state); state.theme = 'blueprint'; assert.equal(lightColor(state), cool);
});
test('idle and freeze stop scene animation, while vacuum motion is reproducible', () => {
  const simulator = createSimulator(); assert.equal(isAnimating(simulator.state), true);
  simulator.preset('idle'); assert.equal(isAnimating(simulator.state), false);
  simulator.preset('demo'); simulator.update({ frozen: true }); assert.equal(isAnimating(simulator.state), false);
  const a = vacuumPosition(initialState, 3.5), b = vacuumPosition(initialState, 3.5); assert.deepEqual(a, b);
  assert.notDeepEqual(a, vacuumPosition(initialState, 9));
});

test('device settings preserve measurements, respect light capabilities and clamp faders', () => {
  const simulator = createSimulator();
  simulator.dispatch({ type: 'toggle-heating' }); assert.equal(simulator.state.heating.active, false);
  simulator.dispatch({ type: 'target-temperature', value: 22.7 }); assert.equal(simulator.state.heating.targetTemperature, 22.5);
  assert.equal(simulator.state.temperature.value, 22.1, 'A setpoint must not replace a measured room temperature');
  simulator.dispatch({ type: 'light-color', value: '#75aaff' }); assert.equal(lightColor(simulator.state), '#75aaff');
  simulator.update({ light: { supportsColor: false } }); simulator.dispatch({ type: 'light-color', value: '#ff0000' });
  assert.equal(simulator.state.light.color, '#75aaff'); assert.notEqual(lightColor(simulator.state), '#75aaff');
  simulator.dispatch({ type: 'color-temperature', value: 6500 }); assert.equal(simulator.state.light.colorMode, 'temperature');
  simulator.dispatch({ type: 'vacuum-state', value: 'paused' }); assert.equal(simulator.state.vacuum.state, 'paused');
  simulator.dispatch({ type: 'vacuum-state', value: 'invalid' }); assert.equal(simulator.state.vacuum.state, 'paused');
  assert.equal(heldFaderValue('light', .5, -34), .7); assert.equal(heldFaderValue('light', .5, 999), 0);
  assert.equal(heldFaderValue('heating', 21, -24), 23); assert.equal(heldFaderValue('heating', 21, 999), 5);
});

test('isometric elevation is vertical; orbit preserves the pinch anchor; trail matches robot position', () => {
  const camera={x:300,y:210,zoom:1.3,angle:.6}, m=matrix(1000,600,camera), point={x:410,y:139};
  const ground=project(point,m), raised=project({...point,z:54},m);
  assert.equal(raised.x,ground.x); assert.ok(raised.y<ground.y-30);
  const orbit=rotateAt(camera,.8,ground,1000,600), rotated=project(point,matrix(1000,600,orbit));
  assert.ok(Math.hypot(rotated.x-ground.x,rotated.y-ground.y)<1e-8);
  const trail=vacuumTrail(initialState,3.5); assert.ok(trail.length>10); assert.deepEqual(trail.at(-1),vacuumPosition(initialState,3.5));
  assert.deepEqual(vacuumTrail({...initialState,vacuum:{...initialState.vacuum,showTrail:false}},3.5),[]);
});
test('isometric window has one pane and no duplicate plan-view symbol', () => {
  const p=palettes.storybook, window=isometricDrawing(drawing(initialState,p),initialState,p).find(o=>o.id==='window');
  assert.equal(window.shapes.filter(s=>s.type==='polygon').length,1);
  assert.equal(window.shapes.some(s=>s.type==='rect'),false);
  assert.equal(window.shapes.length,2,'One glass pane plus its frame');
});

test('three-pane windows keep a large fixed centre and separate opening side panes', () => {
  const spec={origin:[10,20,35],axis:[1,0],width:160,height:70,panes:[.22,.56,.22],frame:2.6};
  const closed=windowGeometry(spec,false),opened=windowGeometry(spec,true);
  const glass=value=>value.geometry3d.filter(s=>s.id?.startsWith('glass-'));
  assert.equal(glass(closed).length,3);assert.equal(closed.parts.length,12);
  const widths=glass(closed).map(s=>Math.hypot(s.vertices[1][0]-s.vertices[0][0],s.vertices[1][1]-s.vertices[0][1]));assert.ok(widths[1]>widths[0]*2);assert.equal(widths[0],widths[2]);
  assert.deepEqual(glass(closed)[1],glass(opened)[1]);assert.notDeepEqual(glass(closed)[0],glass(opened)[0]);assert.notDeepEqual(glass(closed)[2],glass(opened)[2]);
  assert.ok(closed.parts.every(p=>p.top>p.base),'Every frame strip must have a real height');
  for(const pane of [glass(opened)[0],glass(opened)[2]])assert.ok(pane.vertices.every(v=>v[1]>spec.origin[1]),'North window leaves must stay on the room side');
  const door=windowGeometry({origin:[100,20,0],axis:[0,1],inside:[-1,0],width:70,height:130,panes:[1],hinge:'end',door:true,openAngle:.6},true);
  assert.ok(door.geometry3d.filter(s=>s.id).every(s=>s.vertices.every(v=>v[0]<100)),'East balcony door opens into the room, not outside');
  assert.ok(door.parts.some(p=>p.id==='door-handle'));
});

test('raised lamp and upright Ambilight emitters stay centred on their 3D source', () => {
  for(const angle of [.6,2.1])for(const kind of ['bulb','panel']) {
    const source={kind,x:80,y:140,z:54,width:100,height:70,axis:[0,1]},m=emitterMatrix(source,angle);
    const actual={x:m.x+(m.a+m.c)/2,y:m.y+(m.b+m.d)/2},expected=lift(source,source.z,angle);
    assert.ok(Math.hypot(actual.x-expected.x,actual.y-expected.y)<1e-8);
  }
});

test('profile components render table legs separately and cull upright surface backs', () => {
  const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],room={x:0,y:0,width:120,height:120,points:rect(0,0,120,120)};
  const objects=[{id:'room',shapes:[]},{id:'table',height:30,base:27,footprint:rect(20,20,60,70),material:'wood',shapes:[],parts:[[24,24],[72,24],[24,82],[72,82]].map(([x,y])=>({footprint:rect(x,y,4,4),base:0,top:27,material:'wood'}))},
    {id:'screen',height:80,shapes:[],geometry3d:[{type:'polygon',vertices:[[10,10,30],[10,70,30],[10,70,70],[10,10,70]],fill:'#132a36',normal:[1,0,0]},{type:'polygon',vertices:[[10,10,30],[10,70,30],[10,70,70],[10,10,70]],fill:'#132a36',normal:[-1,0,0]}]}];
  const result=isometricDrawing(objects,initialState,palettes.storybook,.6,{room,walls:[]});
  assert.equal(result.find(o=>o.id==='table').shapes.length,15,'Four leg prisms and one thin tabletop');
  assert.equal(result.find(o=>o.id==='screen').shapes.length,1,'Only the facing side of an opaque display is visible');
});

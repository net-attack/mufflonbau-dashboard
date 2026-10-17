import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, collectEntities } from '../src/core/config.js';
import { generateDashboard } from '../src/strategy.js';
const base = { rooms: [{ id:'room', name:'Room', position:{ x:0,y:0,width:300,height:200 } }],
  floorplan_bounds:[-50,-10,400,250], floorplan_drawing:[{tag:'rect',attrs:{x:10,y:10,width:40,height:30,fill:'furniture'}}],
  floorplan_objects:[{id:'outside',room:'room',name:'Outside',icon:'climate',position:{x:-20,y:90},entity:'sensor.outdoor',kind:'temperature'}] };
test('interactive drawing, outdoor devices and room maps propagate without mutating configuration',()=>{
  const before=JSON.stringify(base); const config=normalizeConfig(base);
  assert.ok(collectEntities(config).includes('sensor.outdoor'));
  const result=generateDashboard(base,{states:{}});
  const card=result.views.find(v=>v.path==='rooms').cards[0].cards.find(c=>c.mode==='floorplan');
  assert.deepEqual(card.drawing,base.floorplan_drawing); assert.deepEqual(card.objects,base.floorplan_objects);
  assert.equal(result.views.find(v=>v.path==='room-room').cards[0].cards[0].focus_room,'room');
  assert.equal(JSON.stringify(base),before);
});
test('drawing configuration cannot introduce executable SVG or external content',()=>{
  for(const drawing of [[{tag:'script'}],[{tag:'image',attrs:{href:'https://example.org'}}],[{tag:'rect',attrs:{onclick:'alert(1)'}}],[{tag:'rect',attrs:{fill:'url(https://example.org)'}}]]) {
    assert.throws(()=>normalizeConfig({...base,floorplan_drawing:drawing}),/floorplan_drawing/);
  }
  let nested={tag:'g'}; for(let i=0;i<14;i++) nested={tag:'g',children:[nested]};
  assert.throws(()=>normalizeConfig({...base,floorplan_drawing:[nested]}),/nesting/);
  assert.throws(()=>normalizeConfig({...base,floorplan_drawing:Array.from({length:4001},()=>({tag:'g'}))}),/4000/);
});
test('invalid device bindings fail clearly rather than controlling guessed entities',()=>{
  const device=base.floorplan_objects[0];
  for(const patch of [{room:'missing'},{id:'bad id'},{position:{x:Infinity,y:0}},{action:'toggle'},{kind:'window'}]) {
    assert.throws(()=>normalizeConfig({...base,floorplan_objects:[{...device,...patch}]}),/floorplan_objects/);
  }
  assert.throws(()=>normalizeConfig({...base,floorplan_objects:[device,device]}),/unique/);
  assert.throws(()=>normalizeConfig({...base,floorplan_bounds:[0,0,0,10]}),/floorplan_bounds/);
  assert.doesNotThrow(()=>normalizeConfig({...base,floorplan_objects:[{...device,entity:undefined,kind:'window'}]}));
});
test('wall-switch hints require an explicitly configured light',()=>{
  const device=base.floorplan_objects[0];
  for (const patch of [{wall_switch:true},{wall_switch:'yes'},{entity:undefined,wall_switch:true}]) assert.throws(()=>normalizeConfig({...base,floorplan_objects:[{...device,...patch}]}),/wall_switch/);
  assert.doesNotThrow(()=>normalizeConfig({...base,floorplan_objects:[{...device,entity:'light.example',kind:undefined,wall_switch:true}]}));
});

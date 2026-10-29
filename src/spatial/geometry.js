import {lift,isoPitch,isoHeight} from './camera.js';
import {windowGeometry} from './windows.js';
import {deviceState} from './state.js';
export function sceneObjects(scene,states,p) {
 const devices=new Map((scene.devices??[]).map(d=>[d.id,d]));
 return scene.objects.map(object=>{
  const device=devices.get(object.device??object.id),s=device?deviceState(device,states):null;
  const color=v=>v==='$emissive'||v==='$light'?s?.active?s.color:p.device:v==='$heat'?s?.active?p.heat:p.device:v==='$frame'?p.cool:p[v]??v;
  const shape=v=>({...v,fill:color(v.fill),stroke:color(v.stroke)});
  const result={...object,shapes:(object.shapes??[]).map(shape),flatShapes:object.flatShapes?.map(shape)};
  // Sensor values are native anchored DOM frames, never baked into floor art.
  if(['temperature','humidity'].includes(object.id))result.shapes=[];
  if(object.windowSpec)Object.assign(result,windowGeometry(object.windowSpec,s?.open??false));
  result.parts=result.parts?.map(v=>({...v,material:color(v.material)}));result.geometry3d=result.geometry3d?.map(shape);
  return result;
 });
}
export function geometry(scene,states,p,camera) {
 const objects=sceneObjects(scene,states,p),angle=camera.angle??0,at=(x,y,z=0)=>{const v=lift({x,y},camera.mode==='2d'?0:z,angle);return [v.x,v.y];};
 const poly=(points,fill,sw=.8)=>({type:'polygon',points,fill,stroke:p.wall,sw});
 if(camera.mode==='2d')return objects.map(o=>{
  if(o.flatShapes)return {...o,shapes:o.flatShapes};
  const parts=(o.parts??[]).map(v=>poly(v.footprint,v.material));
  const meshes=(o.geometry3d??[]).filter(s=>!s.normal||s.normal[2]>0||o.windowSpec).map(s=>{const points=s.vertices.map(([x,y])=>[x,y]),area=points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0);return {...s,points,type:s.type==='line'||Math.abs(area)<.01?'line':'polygon',stroke:Math.abs(area)<.01?p.cool:s.stroke,sw:Math.abs(area)<.01?2:s.sw};});
  return {...o,shapes:[...parts,...(o.footprint?[poly(o.footprint,p[o.material]??o.material??p.furniture)]:[]),...meshes,...o.shapes]};
 });
 const shade=(color,n)=>/^#[a-f\d]{6}$/i.test(color)?'#'+color.slice(1).match(/../g).map(v=>Math.round(parseInt(v,16)*n).toString(16).padStart(2,'0')).join(''):color;
 const prism=(points,top,color,base=0)=>{
  const sides=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((b[1]-a[1])*Math.sin(angle)-(b[0]-a[0])*Math.cos(angle)<=0)continue;sides.push(poly([[...a,base],[...b,base],[...b,top],[...a,top]].map(v=>at(...v)),shade(color,.78+i%3*.06)));}
  return [...sides,poly(points.map(v=>at(...v,top)),color)];
 };
 const room=objects.filter(o=>o.layer==='RoomLayer');
 const walls=(scene.walls??[]).filter(w=>w.normal[0]*Math.sin(angle)+w.normal[1]*Math.cos(angle)<0).flatMap(w=>prism([[w.x,w.y],[w.x+w.width,w.y],[w.x+w.width,w.y+w.height],[w.x,w.y+w.height]],w.top,p.furniture,w.base??0));
 const result=[...room,{id:'cutaway-walls',layer:'FurnitureLayer',shapes:walls}];
 const depth=o=>Math.sin(angle)*(o.center?.x??300)+Math.cos(angle)*(o.center?.y??210);
 for(const o of objects.filter(o=>o.layer!=='RoomLayer').sort((a,b)=>(a.height?depth(a):-1000)-(b.height?depth(b):-1000))){
  const z=o.height??0,shift=lift({x:0,y:0},z,angle);
  const top=o.shapes.map(s=>s.points?{...s,points:s.points.map(([x,y])=>[x+shift.x,y+shift.y])}:{...s,x:s.x+shift.x,y:s.y+shift.y});
  const parts=(o.parts??[]).flatMap(v=>prism(v.footprint,v.top,v.material??p.furniture,v.base??0));
  const sides=o.footprint&&z?prism(o.footprint,z,p[o.material]??o.material??p.furniture,o.base??0):[];
  const meshes=(o.geometry3d??[]).filter(s=>!s.normal||s.normal[0]*Math.sin(angle)+s.normal[1]*Math.cos(angle)+s.normal[2]*isoPitch/isoHeight>0);
  if(o.depthSortGeometry)meshes.sort((a,b)=>{const d=s=>s.vertices.reduce((sum,[x,y,z])=>sum+x*Math.sin(angle)+y*Math.cos(angle)+z*isoPitch/isoHeight,0)/s.vertices.length;return d(a)-d(b);});
  const shapes=[...parts,...sides,...(o.windowSpec?[]:top),...meshes.map(s=>({...s,points:s.vertices.map(v=>at(...v))}))];
  if(o.pole)shapes.push({type:'line',points:[at(o.center.x,o.center.y),at(o.center.x,o.center.y,z)],stroke:p.wall,sw:3});
  result.push({...o,shapes});
 }
 return result;
}
export function sensorAnchor(scene,camera) {
 // Keep the frame on a visible, camera-facing cutaway wall, using shared XYZ
 // projection. DOM text stays upright and crisp instead of lying on the floor.
 if(camera.mode==='2d')return {x:scene.room.x+scene.room.width/2,y:scene.room.y+23,z:0};
 const wall=(scene.walls??[]).filter(w=>w.normal[0]*Math.sin(camera.angle)+w.normal[1]*Math.cos(camera.angle)<0).sort((a,b)=>b.width+b.height-a.width-a.height)[0];
 return wall?{x:wall.x+wall.width/2,y:wall.y+wall.height/2,z:wall.top*.75}:{x:scene.room.x+scene.room.width/2,y:scene.room.y,z:50};
}

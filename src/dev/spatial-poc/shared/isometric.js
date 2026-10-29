import { lift, defaultAngle } from './camera.js';
import { scene } from './model.js';
import { isoPitch, isoHeight } from './camera.js';

// Orthographic 3D cutaway with actual heights, projected into each renderer's
// 2D scene graph. Rotation rebuilds this tiny geometry; pan/zoom only changes
// the shared affine camera. No Three.js or renderer-specific geometry copies.
export function isometricDrawing(objects, state, palette, angle = defaultAngle, profile = scene.profile) {
  const p = palette, raised = [];
  const at = (x, y, z = 0) => { const v = lift({ x, y }, z, angle); return [v.x, v.y]; };
  const face = (vertices, color, alpha = 1) => ({ type: 'polygon', points: vertices.map(v => at(...v)), fill: color, stroke: p.wall, sw: .8, alpha });
  const shade = (color, n) => '#' + color.slice(1).match(/../g).map(v => Math.max(0, Math.min(255, Math.round(parseInt(v, 16) * n))).toString(16).padStart(2, '0')).join('');
  const box = (x, y, w, h, top, color, base = 0) => {
    const corners = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]], sides = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      if ((b[1]-a[1]) * Math.sin(angle) - (b[0]-a[0]) * Math.cos(angle) <= 0) continue;
      sides.push(face([[...a,base],[...b,base],[...b,top],[...a,top]], shade(color, .72 + i * .07)));
    }
    sides.sort((a,b) => a.points.reduce((s,v)=>s+v[1],0) - b.points.reduce((s,v)=>s+v[1],0));
    return [...sides, face(corners.map(c => [...c, top]), color)];
  };
  const r = profile?.room ?? scene.room;
  if (profile) {
    const prism = (points, height, color, base=0) => {
      const sides=[];
      for(let i=0;i<points.length;i++) {
        const a=points[i],b=points[(i+1)%points.length];
        if ((b[1]-a[1])*Math.sin(angle)-(b[0]-a[0])*Math.cos(angle)<=0)continue;
        sides.push(face([[...a,base],[...b,base],[...b,height],[...a,height]],shade(color,.78+i%3*.06)));
      }
      return [...sides,face(points.map(point=>[...point,height]),color)];
    };
    const roomObject=objects.find(o=>o.id==='room');
    const result=[{id:'foundation',layer:'RoomLayer',shapes:prism(r.points,0,p.wood,-12)},roomObject];
    const walls=[];
    for(const wall of profile.walls??[]) if(wall.normal[0]*Math.sin(angle)+wall.normal[1]*Math.cos(angle)<0)
      walls.push(...box(wall.x,wall.y,wall.width,wall.height,wall.top,state.theme==='blueprint'?p.furniture:'#e7e1d2',wall.base??0));
    result.push({id:'cutaway-walls',layer:'FurnitureLayer',shapes:walls});
    const ordered=objects.filter(o=>o.id!=='room').map(object=>({ ...object, depth:Math.sin(angle)*(object.center?.x??300)+Math.cos(angle)*(object.center?.y??210) })).sort((a,b)=>(a.height?a.depth:-1000)-(b.height?b.depth:-1000));
    for(const object of ordered) {
      const z=object.height??0,shift=lift({x:0,y:0},z,angle);
      const top=object.shapes.map(s=>s.points?{...s,points:s.points.map(([x,y])=>[x+shift.x,y+shift.y])}:{...s,x:s.x+shift.x,y:s.y+shift.y});
      const material=p[object.material]??(/^#[\da-f]{6}$/i.test(object.material??'')?object.material:p.furniture);
      const sides=object.footprint&&z?prism(object.footprint,z,material,object.base??0):[];
      const parts=(object.parts??[]).flatMap(part=>prism(part.footprint,part.top,p[part.material]??part.material??p.furniture,part.base??0));
      const geometry=(object.geometry3d??[]).filter(shape=>!shape.normal || shape.normal[0]*Math.sin(angle)+shape.normal[1]*Math.cos(angle)+shape.normal[2]*isoPitch/isoHeight>0);
      if(object.depthSortGeometry) {
        const depth=shape=>shape.vertices.reduce((sum,[x,y,z])=>sum+x*Math.sin(angle)+y*Math.cos(angle)+z*isoPitch/isoHeight,0)/shape.vertices.length;
        geometry.sort((a,b)=>depth(a)-depth(b));
      }
      const meshes=geometry
        .map(shape=>({...shape,points:shape.vertices.map(v=>at(...v))}));
      if(object.id==='light') sides.push({type:'line',points:[at(object.center.x,object.center.y),at(object.center.x,object.center.y,z)],stroke:p.wall,sw:3});
      // Glazing is a single vertical volume. Do not draw its old plan-view
      // symbol again on top: that looks like a second window when rotated.
      result.push({...object,shapes:object.id.includes('window')?[...sides,...parts,...meshes]:[...parts,...sides,...top,...meshes]});
    }
    return result;
  }
  const foundation = { id: 'foundation', layer: 'RoomLayer', shapes: box(r.x, r.y, r.width, r.height, 0, p.wood, -15) };
  const room = objects.find(o => o.id === 'room');
  raised.push(foundation, room);
  const walls = [];
  const x = Math.sin(angle) >= 0 ? r.x : r.x + r.width - 7;
  walls.push(...box(x, r.y, 7, r.height, 76, state.theme === 'blueprint' ? p.furniture : '#e2ddcc'));
  if (Math.cos(angle) >= 0) {
    walls.push(...box(r.x, r.y, 215, 7, 76, state.theme === 'blueprint' ? p.furniture : '#ece8d9'));
    walls.push(...box(341, r.y, r.x + r.width - 341, 7, 76, state.theme === 'blueprint' ? p.furniture : '#ece8d9'));
    walls.push(...box(259, r.y, 82, 7, 25, p.wood));
  } else walls.push(...box(r.x, r.y + r.height - 7, r.width, 7, 76, state.theme === 'blueprint' ? p.furniture : '#ece8d9'));
  raised.push({ id: 'cutaway-walls', layer: 'FurnitureLayer', shapes: walls });
  const elevations = { sofa: 32, table: 25, light: 54, heating: 32, window: 40, dehumidifier: 40, temperature: 16, humidity: 16, vacuum: 8 };
  for (const object of objects.filter(o => o.id !== 'room')) {
    const height = elevations[object.id] ?? 0, shift = lift({ x: 0, y: 0 }, height, angle);
    const top = object.shapes.map(s => {
      if (s.type === 'line' || s.type === 'polygon') return { ...s, points: s.points.map(([x,y]) => [x + shift.x, y + shift.y]) };
      return { ...s, x: s.x + shift.x, y: s.y + shift.y };
    });
    const sides = [];
    if (object.id === 'sofa') sides.push(...box(96, 120, 132, 130, 32, p.furniture));
    if (object.id === 'table') {
      for (const [x,y] of [[275,191],[326,191],[275,232],[326,232]]) sides.push(...box(x,y,4,4,22,p.wood));
      sides.push(...box(268,183,70,62,25,p.wood,21));
    }
    if (object.id === 'light') {
      sides.push({ type: 'circle', x: 410, y: 139, r: 17, fill: p.wall, stroke: p.wall, sw: 0, alpha: .2 });
      sides.push({ type: 'line', points: [at(410,139),at(410,139,54)], stroke: p.wall, sw: 4 });
    }
    if (object.id === 'heating') sides.push(...box(442,65,60,29,32,p.heat,14));
    if (object.id === 'dehumidifier') sides.push(...box(468,252,42,55,40,p.device));
    if (object.id === 'window') {
      const open = state.window.state === 'open', y = open ? 25 : 50;
      sides.push(face([[263,50,26],[337,y,26],[337,y,69],[263,50,69]], p.cool, .32));
      sides.push({ type: 'line', points: [[263,50,26],[337,y,26],[337,y,69],[263,50,69],[263,50,26]].map(v=>at(...v)), stroke:p.cool, sw:3 });
    }
    const entity = scene.entities.find(e => e.id === object.id);
    const center = entity ?? (object.id === 'sofa' ? {x:162,y:185} : object.id === 'table' ? {x:303,y:214} : {x:300,y:200});
    raised.push({ ...object, shapes: [...sides, ...(object.id === 'window' ? [] : top)], depth: Math.sin(angle) * center.x + Math.cos(angle) * center.y });
  }
  // Rugs and the dock stay on the ground; furniture/devices are painter-sorted.
  return [...raised.slice(0,3), ...raised.slice(3).sort((a,b) => (a.id === 'rug' || a.id === 'dock' ? -1000 : a.depth) - (b.id === 'rug' || b.id === 'dock' ? -1000 : b.depth))];
}

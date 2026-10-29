import { scene, lightColor, lightState } from './model.js';
import { windowGeometry } from './windows.js';
// Optional local-only scene data. The default build and CI stay synthetic.
export function applyProfile(profile) {
  if (!profile?.room?.points?.length || !Array.isArray(profile.objects)) throw new Error('Invalid local scene profile');
  scene.profile = profile; scene.room = profile.room;
  scene.entities = scene.entities.filter(entity => !profile.omitEntities?.includes(entity.id)).map(entity => ({ ...entity, ...profile.entities?.[entity.id] }));
  for (const [id, entity] of Object.entries(profile.entities ?? {})) if (!scene.entities.some(e => e.id === id)) scene.entities.push({ id, radius: 23, ...entity });
  scene.route = profile.route;
}
export function profileDrawing(state, palette) {
  const profile = scene.profile;
  const colorFor = id => value => value === '$light' ? lightColor(state,id) : value === '$emissive' ? lightState(state,id).active && lightState(state,id).brightness>0 ? lightColor(state,id) : palette.device : value === '$frame' ? state.theme==='blueprint' ? palette.cool : palette.device : value === '$heat' ? state.heating.active ? palette.heat : palette.device : palette[value] ?? value;
  return profile.objects.map(object => {
    const color = colorFor(object.entity ?? object.id);
    const result={ ...object, shapes: object.shapes.map(shape => ({ ...shape, fill: color(shape.fill), stroke: color(shape.stroke),
      value: shape.value === '$temperature' ? `${state.temperature.value.toFixed(1)} °C` : shape.value === '$humidity' ? `${state.humidity.value} %` : shape.value === '$heatLabel' ? `${state.heating.active ? 'An' : 'Aus'} · ${state.heating.targetTemperature.toFixed(1)} °C` : shape.value })) };
    if (object.flatShapes) result.flatShapes=object.flatShapes.map(s=>({...s,fill:color(s.fill),stroke:color(s.stroke)}));
    if(object.windowSpec) { Object.assign(result, windowGeometry(object.windowSpec,state.window.state==='open')); result.footprint=null; }
    if(result.parts) result.parts=result.parts.map(part=>({...part,material:color(part.material)}));
    if(result.geometry3d) result.geometry3d=result.geometry3d.map(shape=>({...shape,fill:color(shape.fill),stroke:color(shape.stroke)}));
    if(!object.windowSpec && object.id.includes('window') && state.window.state==='open' && object.footprint) {
      const [x,y]=object.footprint[0], angle=object.id==='window'?-.18:.18;
      result.footprint=object.footprint.map(([px,py])=>[x+(px-x)*Math.cos(angle)-(py-y)*Math.sin(angle),y+(px-x)*Math.sin(angle)+(py-y)*Math.cos(angle)]);
    }
    return result;
  });
}

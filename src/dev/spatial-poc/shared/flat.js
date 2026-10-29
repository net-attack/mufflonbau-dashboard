import { scene } from './model.js';

// A real top view: no elevation offsets or isometric wall occlusion. The same
// furniture footprints, glazing leaves and semantic hit points serve all backends.
export function flatDrawing(objects, state, palette, profile = scene.profile) {
  if (!profile) return objects;
  const polygon = (points, fill) => ({ type: 'polygon', points, fill, stroke: palette.wall, sw: 1 });
  return objects.map(object => {
    if (object.flatShapes) return { ...object, shapes: object.flatShapes };
    const parts = (object.parts ?? []).map(p => polygon(p.footprint, palette[p.material] ?? p.material ?? palette.furniture));
    const meshes = (object.geometry3d ?? []).filter(s => !s.normal || s.normal[2] > 0 || object.windowSpec).map(s => {
      const points=s.vertices.map(([x,y])=>[x,y]);
      const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
      return { ...s, type: s.type==='line' || Math.abs(area)<.01 ? 'line' : 'polygon', points,
        stroke: Math.abs(area)<.01 ? palette.cool : s.stroke, sw: Math.abs(area)<.01 ? 2 : s.sw };
    });
    const footprint=object.footprint ? [polygon(object.footprint,palette[object.material] ?? object.material ?? palette.furniture)] : [];
    return { ...object, shapes:[...parts,...footprint,...meshes,...object.shapes] };
  });
}

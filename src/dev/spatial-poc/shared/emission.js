import { scene } from './model.js';
import { lift } from './camera.js';

export function lightEmitters() {
  if (scene.profile?.emitters) return scene.profile.emitters;
  const light = scene.entities.find(e=>e.id==='light');
  return light ? [{ id:'light-head', x:light.x, y:light.y, z:light.z, width:40, height:40, gain:.8, placement:'front' }] : [];
}
// Transform a unit square to the emitting surface before the shared camera.
// Panel emitters stand upright; bulbs use a small glow at the actual lamp head.
export function emitterMatrix(source, angle, mode = '3d') {
  if (mode === '2d') {
    const width = source.kind === 'panel' ? 26 : source.width, height = source.kind === 'panel' ? source.width : source.height;
    return { a:width,b:0,c:0,d:height,x:source.x-width/2,y:source.y-height/2 };
  }
  const { x,y,z,width,height } = source;
  const axis = source.axis ?? [1,0];
  const p0 = source.kind==='panel' ? lift({x:x-axis[0]*width/2,y:y-axis[1]*width/2},z+height/2,angle) : lift({x:x-width/2,y:y-height/2},z,angle);
  const p1 = source.kind==='panel' ? lift({x:x+axis[0]*width/2,y:y+axis[1]*width/2},z+height/2,angle) : lift({x:x+width/2,y:y-height/2},z,angle);
  const p3 = source.kind==='panel' ? lift({x:x-axis[0]*width/2,y:y-axis[1]*width/2},z-height/2,angle) : lift({x:x-width/2,y:y+height/2},z,angle);
  return {a:p1.x-p0.x,b:p1.y-p0.y,c:p3.x-p0.x,d:p3.y-p0.y,x:p0.x,y:p0.y};
}

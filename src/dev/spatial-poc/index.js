import { scene, createSimulator } from './shared/model.js';
import { createLab } from './shell.js';
import { applyProfile } from './shared/profile.js';
if (new URL(location.href).searchParams.get('profile') === 'local') {
  const response = await fetch('/dev/spatial-poc/profile.local.json');
  if (!response.ok) throw new Error('Lokales Profil nicht freigegeben. Server mit SPATIAL_POC_PROFILE starten.');
  const data=await response.json();
  if(data.rooms) {
    scene.roomChoices=data.rooms.map(({id,label})=>({id,label}));
    const id=new URL(location.href).searchParams.get('room');
    applyProfile(data.rooms.find(room=>room.id===id) ?? data.rooms[0]);
  } else applyProfile(data);
}
document.documentElement.dataset.presentation=new URL(location.href).searchParams.get('presentation')??'lab';
const simulator = createSimulator();
if (matchMedia('(prefers-reduced-motion: reduce)').matches) simulator.update({ frozen: true });
window.spatialPoc = await createLab(simulator);

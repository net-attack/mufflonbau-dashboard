import { zoomAt, rotateAt, matrix, unproject } from './camera.js';
import { heldFaderValue, isLightEntity, lightState } from './model.js';
export function attachInteractions(viewport, panel) {
  const abort = new AbortController(), pointers = new Map();
  let gesture = null, timer, held = false;
  const listen = (node, name, fn, extra = {}) => node.addEventListener(name, fn, { signal: abort.signal, ...extra });
  const cancel = () => { clearTimeout(timer); timer = undefined; };
  const sample = () => {
    const [a, b] = [...pointers.values()];
    return b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y), angle: Math.atan2(b.y-a.y,b.x-a.x) } : { ...a, distance: 0 };
  };
  listen(viewport, 'pointerdown', e => {
    if (![0,2].includes(e.button) || e.target.closest?.('.device-popup')) return;
    const rect = viewport.getBoundingClientRect();
    pointers.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (pointers.size > 1) { cancel(); held = false; gesture.fader = null; gesture.moved = true; gesture.last = sample(); return; }
    held = false; const orbit=e.button===2, target = orbit ? null : panel.renderer.hitTest(e);
    gesture = { target, orbit, start: sample(), last: sample(), moved: false };
    if (target) timer = setTimeout(() => {
      held = true;
      if (isLightEntity(target) || target === 'heating') {
        gesture.fader = target;
        gesture.initial = isLightEntity(target) ? lightState(panel.simulator.state,target).brightness : panel.simulator.state.heating.targetTemperature;
      }
      panel.openPopup(target, false);
    }, 480);
    viewport.setPointerCapture(e.pointerId);
  });
  listen(viewport, 'pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    const rect = viewport.getBoundingClientRect(); pointers.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    const next = sample(); if (!gesture) return;
    if(gesture.orbit) {
      const delta=-(next.x-gesture.last.x)*.009;
      if(Math.abs(next.x-gesture.start.x)>3)gesture.moved=true;
      if(delta)panel.setCamera(rotateAt(panel.camera,delta,{x:rect.width/2,y:rect.height/2},rect.width,rect.height));
      gesture.last=next;return;
    }
    if (held && gesture.fader && pointers.size === 1) {
      panel.simulator.dispatch({ entity: gesture.fader, type: isLightEntity(gesture.fader) ? 'brightness' : 'target-temperature', value: heldFaderValue(isLightEntity(gesture.fader) ? 'light' : gesture.fader, gesture.initial, next.y - gesture.start.y) });
      return;
    }
    if (!gesture.moved && Math.hypot(next.x - gesture.start.x, next.y - gesture.start.y) < 6) return;
    cancel(); gesture.moved = true;
    let camera = panel.camera;
    if (gesture.last.distance && next.distance) camera = zoomAt(camera, next.distance / gesture.last.distance, gesture.last, rect.width, rect.height);
    if (gesture.last.distance && next.distance) {
      const delta = Math.atan2(Math.sin(next.angle-gesture.last.angle),Math.cos(next.angle-gesture.last.angle));
      camera = rotateAt(camera, delta, gesture.last, rect.width, rect.height);
    }
    const m = matrix(rect.width, rect.height, camera), a = unproject(next,m), b = unproject(gesture.last,m);
    panel.setCamera({ ...camera, x: camera.x - a.x + b.x, y: camera.y - a.y + b.y });
    gesture.last = next;
  });
  const up = e => {
    if (!pointers.has(e.pointerId)) return;
    cancel(); pointers.delete(e.pointerId);
    if (e.type !== 'pointerup') { gesture = null; pointers.clear(); return; }
    if (pointers.size) { gesture.last = sample(); return; }
    if (gesture && !gesture.moved && !held && !gesture.orbit) {
      if (isLightEntity(gesture.target)) panel.simulator.dispatch({ type: 'toggle-light', entity: gesture.target });
      else if (gesture.target === 'heating') { panel.simulator.dispatch({ type: 'toggle-heating' }); panel.openPopup('heating'); }
      else if (gesture.target) panel.openPopup(gesture.target);
      else panel.closePopup(false);
    }
    gesture = null;
  };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(viewport, name, up);
  listen(viewport,'contextmenu',e=>{if(!e.target.closest?.('.device-popup'))e.preventDefault();});
  listen(viewport, 'wheel', e => {
    if (e.target.closest?.('.device-popup')) return;
    // A plain wheel scrolls the page; Ctrl/Meta+wheel and trackpad pinch zoom.
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault(); cancel();
    const rect = viewport.getBoundingClientRect();
    panel.setCamera(zoomAt(panel.camera, Math.exp(-e.deltaY * .008), { x: e.clientX - rect.left, y: e.clientY - rect.top }, rect.width, rect.height));
  }, { passive: false });
  listen(viewport, 'keydown', e => {
    if (e.target.closest?.('.device-popup')) return;
    const id = e.target.dataset?.entity;
    if (id && ['Enter', ' '].includes(e.key)) { e.preventDefault(); if (e.key === ' ' && (isLightEntity(id) || id === 'heating')) panel.simulator.dispatch({ entity: id, type: isLightEntity(id) ? 'toggle-light' : 'toggle-heating' }); else panel.openPopup(id); }
    if (e.key === 'Escape') panel.closePopup();
  });
  return () => { cancel(); abort.abort(); pointers.clear(); };
}

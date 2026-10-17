// Shared camera for SVG floorplans and Home Assistant camera cards.
export function mapGestures(viewport, content, camera = { zoom: 1, x: 0, y: 0 }) {
  const pointers = new Map();
  let start, moved = false;
  const paint = () => {
    const rect = viewport.getBoundingClientRect();
    camera.x = Math.max(-rect.width * (camera.zoom - 1) / 2, Math.min(rect.width * (camera.zoom - 1) / 2, camera.x));
    camera.y = Math.max(-rect.height * (camera.zoom - 1) / 2, Math.min(rect.height * (camera.zoom - 1) / 2, camera.y));
    content.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
  };
  const zoom = (value, point) => {
    const rect = viewport.getBoundingClientRect();
    const next = Math.max(1, Math.min(6, value));
    const x = point ? point.x - rect.left - rect.width / 2 : 0;
    const y = point ? point.y - rect.top - rect.height / 2 : 0;
    camera.x = x - (x - camera.x) * next / camera.zoom;
    camera.y = y - (y - camera.y) * next / camera.zoom;
    camera.zoom = next;
    paint();
  };
  const sample = () => {
    const [a, b] = [...pointers.values()];
    return b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) } : { ...a, distance: 0 };
  };
  const down = event => {
    if (event.button !== 0) return;
    if (!pointers.size) moved = false;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    start = sample();
    if (pointers.size > 1) moved = true;
  };
  const move = event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const next = sample();
    if (!moved && Math.hypot(next.x - start.x, next.y - start.y) < 6) return;
    moved = true;
    viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
    if (start.distance && next.distance) zoom(camera.zoom * next.distance / start.distance, start);
    camera.x += next.x - start.x;
    camera.y += next.y - start.y;
    paint();
    start = next;
  };
  const up = event => {
    if (event.type === 'lostpointercapture' && event.target !== viewport) return;
    pointers.delete(event.pointerId);
    if (pointers.size) start = sample();
  };
  const click = event => {
    if (moved && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  const wheel = event => {
    // Trackpad pinch is delivered as Ctrl+wheel. Ordinary scrolling can still
    // reach the page, especially alongside the cleaning controls.
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoom(camera.zoom * Math.exp(-event.deltaY * .01), { x: event.clientX, y: event.clientY });
  };
  viewport.addEventListener('pointerdown', down);
  viewport.addEventListener('pointermove', move);
  viewport.addEventListener('pointerup', up);
  viewport.addEventListener('pointercancel', up);
  viewport.addEventListener('lostpointercapture', up);
  viewport.addEventListener('click', click, true);
  viewport.addEventListener('wheel', wheel, { passive: false });
  const observer = new ResizeObserver(paint);
  observer.observe(viewport);
  paint();
  return { zoom, reset: () => { camera.zoom = 1; camera.x = camera.y = 0; paint(); },
    destroy: () => {
      observer.disconnect();
      for (const [name, listener] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up], ['lostpointercapture', up], ['wheel', wheel]]) viewport.removeEventListener(name, listener);
      viewport.removeEventListener('click', click, true);
    } };
}

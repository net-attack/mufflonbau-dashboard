export const defaultAngle = Math.PI / 5;
export const isoPitch = .58, isoHeight = .816;
export function lift(point, z = point.z ?? 0, angle = defaultAngle) {
  const shift = -z * isoHeight / isoPitch;
  return { x: point.x + Math.sin(angle) * shift, y: point.y + Math.cos(angle) * shift };
}
export function matrix(width, height, camera) {
  const flat = camera.mode === '2d';
  const fit = flat ? Math.min(width / 600, height / 420) : Math.min(width / 720, height / 480);
  const scale = fit * camera.zoom;
  const angle = camera.angle ?? (flat ? 0 : defaultAngle), cos = Math.cos(angle), sin = Math.sin(angle);
  const a = cos * scale, b = sin * scale * (flat ? 1 : isoPitch), c = -sin * scale, d = cos * scale * (flat ? 1 : isoPitch);
  return { scale, angle, mode: flat ? '2d' : '3d', heightScale: flat ? 0 : isoHeight, a, b, c, d, x: width / 2 - camera.x * a - camera.y * c,
    y: height * (flat ? .5 : .59) - camera.x * b - camera.y * d };
}
export const project = (point, m) => ({ x: point.x * m.a + point.y * m.c + m.x, y: point.x * m.b + point.y * m.d + m.y - (point.z ?? 0) * m.scale * (m.heightScale ?? isoHeight) });
export const unproject = (point, m) => {
  const det = m.a * m.d - m.b * m.c, x = point.x - m.x, y = point.y - m.y;
  return { x: (m.d * x - m.c * y) / det, y: (-m.b * x + m.a * y) / det };
};
export function zoomAt(camera, factor, point, width, height) {
  const before = unproject(point, matrix(width, height, camera));
  const next = { ...camera, zoom: Math.max(.65, Math.min(4, camera.zoom * factor)) };
  const after = unproject(point, matrix(width, height, next));
  next.x += before.x - after.x; next.y += before.y - after.y;
  return next;
}
export function rotateAt(camera, delta, point, width, height) {
  const before = unproject(point, matrix(width, height, camera));
  const next = { ...camera, angle: (camera.angle ?? defaultAngle) + delta };
  const after = unproject(point, matrix(width, height, next));
  next.x += before.x - after.x; next.y += before.y - after.y; return next;
}
export function placeOverlay(anchor, viewport, size = { width: 230, height: 180 }) {
  const margin = 10;
  const width = Math.min(size.width, Math.max(1, viewport.width - margin * 2));
  const x = Math.max(margin, Math.min(viewport.width - width - margin, anchor.x - width / 2));
  const below = anchor.y + 30;
  const y = below + size.height <= viewport.height - margin ? below : anchor.y - size.height - 30;
  return { x, y: Math.max(margin, Math.min(viewport.height - size.height - margin, y)), width,
    anchorX: Math.max(margin, Math.min(viewport.width - margin, anchor.x)),
    anchorY: Math.max(margin, Math.min(viewport.height - margin, anchor.y)),
    offscreen: anchor.x < 0 || anchor.y < 0 || anchor.x > viewport.width || anchor.y > viewport.height };
}

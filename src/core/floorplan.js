// A deliberately small, code-native SVG vocabulary: no HTML, URLs or scripts.
export const drawingTags = new Set(['g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'text']);
export const drawingAttributes = new Set(['d', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'x2', 'y1', 'y2', 'points', 'transform', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'fill-opacity', 'font-size', 'text-anchor']);
export const drawingColors = { wall: '--mb-accent', floor: '--mb-map-floor', furniture: '--mb-map-furniture', cushion: '--mb-map-cushion', wood: '--mb-map-wood', water: '--mb-map-water', light: '--mb-map-light', radiator: '--mb-map-radiator' };
export function validateDrawing(nodes, path = 'floorplan_drawing', depth = 0, budget = { left: 4000 }) {
  const fail = message => { throw new Error(`Mufflonbau: ${path} ${message}`); };
  if (!Array.isArray(nodes) || depth > 12) fail('must be a drawing array with at most 12 nesting levels.');
  for (const [index, node] of nodes.entries()) {
    if (--budget.left < 0) fail('exceeds 4000 drawing nodes.');
    if (!node || !drawingTags.has(node.tag)) fail(`[${index}].tag is not a supported drawing shape.`);
    if (node.attrs !== undefined && (!node.attrs || typeof node.attrs !== 'object' || Array.isArray(node.attrs))) fail(`[${index}].attrs must be an object.`);
    for (const [key, value] of Object.entries(node.attrs ?? {})) {
      if (!drawingAttributes.has(key) || !['number', 'string'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value))) fail(`[${index}].attrs.${key} is not supported.`);
      if (['fill', 'stroke'].includes(key) && value !== 'none' && !Object.hasOwn(drawingColors, value)) fail(`[${index}].attrs.${key} must use a theme color or none.`);
    }
    if (node.text !== undefined && (node.tag !== 'text' || typeof node.text !== 'string')) fail(`[${index}].text must belong to a text shape.`);
    if (node.children !== undefined) validateDrawing(node.children, `${path}[${index}].children`, depth + 1, budget);
  }
}

export function appendDrawing(parent, nodes, create) {
  for (const shape of nodes ?? []) {
    if (!drawingTags.has(shape.tag)) continue;
    const attrs = Object.fromEntries(Object.entries(shape.attrs ?? {}).filter(([key, value]) => drawingAttributes.has(key) && (!['fill', 'stroke'].includes(key) || value === 'none' || Object.hasOwn(drawingColors, value))).map(([key, value]) =>
      [key, ['fill', 'stroke'].includes(key) && drawingColors[value] ? `var(${drawingColors[value]})` : value]));
    const node = create(shape.tag, attrs, shape.text);
    appendDrawing(node, shape.children, create);
    parent.append(node);
  }
}

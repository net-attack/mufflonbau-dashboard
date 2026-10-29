// Vertical glazing and frames shared by SVG and Pixi. Dimensions and pane
// proportions are scene data; no private apartment coordinates live here.
export function windowGeometry(spec, open = false) {
  const { origin: [x, y, z], axis = [1, 0], width, height, panes = [1], frame = 2.6 } = spec;
  const total = panes.reduce((sum, value) => sum + value, 0);
  const parts = [], geometry3d = [];
  let offset = 0;
  for (let index = 0; index < panes.length; index++) {
    const span = width * panes[index] / total;
    const start = offset; offset += span;
    // The large centre pane stays fixed. Side leaves demonstrate opening.
    const endHinge = spec.hinge ? spec.hinge==='end' : panes.length>1 && index===panes.length-1;
    const leafAxis = axis.map(value=>endHinge?-value:value);
    const inside = spec.inside ?? [-axis[1],axis[0]];
    const sign = -leafAxis[1]*inside[0]+leafAxis[0]*inside[1] >= 0 ? 1 : -1;
    const swing = open && (panes.length === 1 || index !== Math.floor(panes.length / 2)) ? sign*(spec.openAngle??.3) : 0;
    const direction = [leafAxis[0] * Math.cos(swing) - leafAxis[1] * Math.sin(swing), leafAxis[0] * Math.sin(swing) + leafAxis[1] * Math.cos(swing)];
    const hingeOffset=start+(endHinge?span:0);
    const base = [x + axis[0] * hingeOffset, y + axis[1] * hingeOffset];
    const point = (u, depth = 0) => [base[0] + direction[0] * u - direction[1] * depth, base[1] + direction[1] * u + direction[0] * depth];
    const strip = (id, u, length, bottom, top) => ({ id: `pane-${index}-${id}`, footprint: [point(u, -frame/2), point(u+length, -frame/2), point(u+length, frame/2), point(u, frame/2)], base: z+bottom, top: z+top, material: '$frame' });
    parts.push(strip('sill', 0, span, 0, frame), strip('lintel', 0, span, height-frame, height),
      strip('left', 0, frame, frame, height-frame), strip('right', span-frame, frame, frame, height-frame));
    // One glass quad per pane, never another plan-view symbol or second face.
    const left = point(frame, -.1), right = point(span-frame, -.1);
    geometry3d.push({ id: `glass-${index}`, type: 'polygon', vertices: [[...left,z+frame],[...right,z+frame],[...right,z+height-frame],[...left,z+height-frame]], fill:'cool', stroke:'cool', sw:.65, alpha:.23 });
    const a = point(frame+2, -.2), b = point(Math.max(frame+3,span-frame-3), -.2);
    geometry3d.push({ type:'line', vertices:[[...a,z+height-frame-4],[...b,z+frame+4]], stroke:'device', sw:1, alpha:.4 });
    if(spec.door) {
      const u=span-frame-5;
      parts.push({id:'door-handle',footprint:[point(u,-4),point(u+6,-4),point(u+6,-1.5),point(u,-1.5)],base:z+height*.48,top:z+height*.48+2.2,material:'wall'});
    }
  }
  return { parts, geometry3d };
}

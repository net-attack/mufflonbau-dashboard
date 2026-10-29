import { svgElement as svg } from '../../../design/dom.js';
import { drawing } from '../shared/drawing.js';
import { scene, vacuumPosition, vacuumTrail, lightColor, lightState } from '../shared/model.js';
import { palettes } from '../shared/themes.js';
import { isometricDrawing } from '../shared/isometric.js';
import { flatDrawing } from '../shared/flat.js';
import { lift, defaultAngle } from '../shared/camera.js';
import { lightEmitters, emitterMatrix } from '../shared/emission.js';
let serial = 0;
export class SvgRenderer {
  constructor(viewport, { effects = true } = {}) {
    this.viewport = viewport; this.effects = effects; this.id = `spatial-${++serial}`;
    this.element = svg('svg', { class: 'scene-svg', role: 'group', 'aria-label': 'Synthetisches Wohnzimmer' });
    this.world = svg('g'); this.element.append(this.world); viewport.prepend(this.element);
    this.backend = effects ? 'SVG / DOM' : 'SVG + WebGL';
  }
  update(state) {
    this.state = state; this.world.replaceChildren(); const p = palettes[state.theme];
    const defs = svg('defs');
    const gradient = svg('radialGradient', { id: `${this.id}-glow` });
    gradient.append(svg('stop', { offset: '0%', 'stop-color': lightColor(state), 'stop-opacity': '.85' }), svg('stop', { offset: '100%', 'stop-color': lightColor(state), 'stop-opacity': '0' }));
    for (const [name, color] of [['heat', p.heat], ['cool', p.cool], ['error', '#ee625c']]) {
      const glow = svg('radialGradient', { id: `${this.id}-${name}` });
      glow.append(svg('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '.7' }), svg('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' })); defs.append(glow);
    }
    const clip = svg('clipPath', { id: `${this.id}-room` });
    clip.append(scene.room.points ? svg('polygon',{points:scene.room.points.map(p=>p.join(',')).join(' ')}) : svg('rect', { x: 47, y: 51, width: 506, height: 312, rx: 15 }));
    defs.append(gradient, clip); this.world.append(defs);
    const objects = (this.mode === '2d' ? flatDrawing(drawing(state,p),state,p) : isometricDrawing(drawing(state, p), state, p, this.angle ?? defaultAngle)); this.vacuum = null;
    for (const object of objects) {
      if (object.layer === 'DeviceLayer' && !this.effectsGroup) this.addEffects(state, p);
      const group = svg('g', { 'data-object': object.id, opacity:object.opacity??1 });
      for (const s of object.shapes) {
        let node;
        const attrs = { fill: s.fill ?? 'none', stroke: s.stroke ?? 'none', 'stroke-width': s.sw ?? 0, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: s.alpha ?? 1 };
        if (s.type === 'rect') node = svg('rect', { ...attrs, x: s.x, y: s.y, width: s.w, height: s.h, rx: s.r });
        if (s.type === 'circle') node = svg('circle', { ...attrs, cx: s.x, cy: s.y, r: s.r });
        if (s.type === 'line') node = svg('polyline', { ...attrs, points: s.points.map(p => p.join(',')).join(' ') });
        if (s.type === 'polygon') node = svg('polygon', { ...attrs, points: s.points.map(p => p.join(',')).join(' ') });
        if (s.type === 'text') node = svg('text', { x: s.x, y: s.y, fill: s.fill, 'font-size': s.size, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-weight': s.size >= 14 ? '600' : '500' }, s.value);
        group.append(node);
      }
      if (object.moving) this.vacuum = group;
      this.world.append(group);
    }
    if(this.effects) {
      const back=svg('g',{'data-source-layer':'back','pointer-events':'none'}), front=svg('g',{'data-source-layer':'front','pointer-events':'none'});
      for(const source of lightEmitters()) {
        const lamp=lightState(state,source.entity), m=emitterMatrix(source,this.angle??defaultAngle,this.mode);
        if(!lamp.active || lamp.brightness<=0)continue;
        const glowId=`${this.id}-${source.id}-glow`, gradient=svg('radialGradient',{id:glowId});
        gradient.append(svg('stop',{offset:'0%','stop-color':lightColor(state,source.entity),'stop-opacity':'.85'}),svg('stop',{offset:'100%','stop-color':lightColor(state,source.entity),'stop-opacity':'0'}));defs.append(gradient);
        const group=svg('g',{'data-emitter':source.id,transform:`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.x} ${m.y})`,opacity:lamp.brightness*(source.gain??.8)});
        const glow=svg('rect',{width:1,height:1,fill:`url(#${glowId})`});group.append(glow);
        if(source.cutout) {
          const maskId=`${this.id}-${source.id}-mask`,mask=svg('mask',{id:maskId,maskUnits:'userSpaceOnUse',maskContentUnits:'userSpaceOnUse',x:0,y:0,width:1,height:1});
          mask.append(svg('rect',{width:1,height:1,fill:'white'}),svg('rect',{...source.cutout,fill:'black'}));defs.append(mask);glow.setAttribute('mask',`url(#${maskId})`);
        }
        (source.placement==='back'?back:front).append(group);
      }
      const walls=this.world.querySelector('[data-object="cutaway-walls"]');if(walls)walls.after(back);else this.world.prepend(back);
      this.world.append(front);
    }
    if(this.vacuum) this.world.append(this.vacuum);
    // Keep SVG geometry as the hit-test source in both SVG and hybrid modes.
    this.hits = new Map();
    for (const entity of scene.entities) {
      const elevated = lift(entity, this.mode === '2d' ? 0 : entity.z, this.angle ?? defaultAngle);
      const hit = svg('circle', { cx: elevated.x, cy: elevated.y, r: entity.radius, fill: 'transparent', class: 'hit-area', 'data-entity': entity.id, tabindex: '0', role: 'button', 'aria-label': entity.id === 'light' ? 'Leselicht umschalten; Details mit Enter oder langem Drücken' : entity.name });
      this.hits.set(entity.id, hit); this.world.append(hit);
    }
    this.effectsGroup = null; // Recreated only on semantic updates, never per frame.
    this.frame(0);
  }
  addEffects(state, p) {
    this.anchors=Object.fromEntries(scene.entities.map(e=>[e.id,e]));const a=this.anchors;
    this.effectsGroup = svg('g', { 'pointer-events': 'none', 'clip-path': `url(#${this.id}-room)` });
    this.world.append(this.effectsGroup); this.heat = []; this.air = []; this.scan = null; this.robotEffect = null; this.robotRing = null;
    this.trail = null;
    if (!this.effects) return;
    this.trail = svg('polyline', { fill:'none', stroke:p.cool, 'stroke-width':2, 'stroke-dasharray':'4 5', opacity:.65, 'stroke-linecap':'round' });
    this.effectsGroup.append(this.trail);
    if (a.light && state.light.active) this.effectsGroup.append(svg('ellipse', { cx: a.light.x, cy: a.light.y, rx: 155, ry: 145, fill: `url(#${this.id}-glow)`, opacity: state.light.brightness * .8 }));
    if (a.heating && state.heating.active) this.effectsGroup.append(svg('ellipse', { cx: a.heating.x, cy: a.heating.y-10, rx: 57, ry: 45, fill: `url(#${this.id}-heat)`, opacity: state.heating.level * .3 }));
    if (a.dehumidifier && state.dehumidifier.state === 'running') this.effectsGroup.append(svg('ellipse', { cx: a.dehumidifier.x, cy: a.dehumidifier.y-30, rx: 35, ry: 45, fill: `url(#${this.id}-cool)`, opacity: .2 }));
    if (['cleaning', 'error'].includes(state.vacuum.state)) {
      this.robotEffect = svg('g');
      this.robotEffect.append(svg('circle', { r: 38, fill: `url(#${this.id}-${state.vacuum.state === 'error' ? 'error' : 'cool'})`, opacity: .3 }));
      this.robotRing = svg('circle', { r: 27, fill: 'none', stroke: state.vacuum.state === 'error' ? '#ee625c' : p.cool, 'stroke-width': 1.3, opacity: .5 });
      this.robotEffect.append(this.robotRing); this.effectsGroup.append(this.robotEffect);
    }
    if (a.heating && state.heating.active) for (let i = 0; i < 4; i++) {
      const wave = svg('path', { d: `M${a.heating.x-25 + i * 15} ${a.heating.y-10} q-9 -8 0 -16 t0 -16`, fill: 'none', stroke: p.heat, 'stroke-width': 2, opacity: .6 });
      this.heat.push(wave); this.effectsGroup.append(wave);
    }
    if (a.dehumidifier && state.dehumidifier.state === 'running' || a.window && state.window.state === 'open') for (let i = 0; i < 10; i++) {
      const particle = svg('circle', { cx: 0, cy: 0, r: i % 2 ? 2 : 1.3, fill: p.cool });
      this.air.push(particle); this.effectsGroup.append(particle);
    }
    if (state.theme === 'blueprint' && (state.heating.active || state.dehumidifier.state === 'running' || state.vacuum.state === 'cleaning')) {
      this.scan = svg('line', { x1: 46, x2: 554, y1: 0, y2: 0, stroke: p.cool, 'stroke-width': 1, opacity: .25 }); this.effectsGroup.append(this.scan);
    }
  }
  frame(time) {
    const pos = vacuumPosition(this.state, time);
    this.vacuum?.setAttribute('transform', `translate(${pos.x} ${pos.y})`);
    this.robotEffect?.setAttribute('transform', `translate(${pos.x} ${pos.y})`);
    this.robotRing?.setAttribute('r', String(27 * (1 + .06 * Math.sin(time * 3))));
    const elevated = lift(pos, this.mode === '2d' ? 0 : 8, this.angle ?? defaultAngle);
    const hit = this.hits?.get('vacuum'); hit?.setAttribute('cx', elevated.x); hit?.setAttribute('cy', elevated.y);
    this.trail?.setAttribute('points', vacuumTrail(this.state, time).map(p => `${p.x},${p.y}`).join(' '));
    this.heat?.forEach((wave, i) => { const phase = (time * .55 + i * .23) % 1; wave.setAttribute('transform', `translate(0 ${-phase * 16})`); wave.setAttribute('opacity', String((1 - phase) * this.state.heating.level)); });
    this.air?.forEach((particle, i) => {
      const phase = (time * .28 + i * .13) % 1;
      const a=this.anchors, window = this.state.window.state === 'open' && (i < 5 || this.state.dehumidifier.state !== 'running' || !a.dehumidifier);
      particle.setAttribute('cx', window ? a.window.x-25 + i * 8 : a.dehumidifier.x + Math.sin(i * 2) * phase * 23);
      particle.setAttribute('cy', window ? a.window.y+10 + phase * 65 : a.dehumidifier.y-28 - phase * 56);
      particle.setAttribute('opacity', String(Math.sin(phase * Math.PI) * .7));
    });
    if (this.scan) this.scan.setAttribute('transform', `translate(0 ${52 + time * 22 % 308})`);
    if (this.state.vacuum.state === 'error') this.vacuum?.setAttribute('opacity', String(.72 + .28 * Math.cos(time * 4)));
  }
  camera(m, width, height) {
    if (this.angle !== m.angle || this.mode !== m.mode) { this.angle = m.angle; this.mode = m.mode; this.update(this.state); }
    this.element.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.world.setAttribute('transform', `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.x} ${m.y})`);
  }
  hitTest(event) { return event.target.closest?.('[data-entity]')?.dataset.entity; }
  metrics() { return { backend: this.backend, objects: this.element.querySelectorAll('*').length, resolution: 'vector', renderCalls: null }; }
  destroy() { this.element.remove(); }
}

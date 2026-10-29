import { Application, Container, Graphics, Text, Circle, Matrix, EventsTicker, Ticker } from 'pixi.js';
import { drawing } from '../shared/drawing.js';
import { scene, vacuumPosition } from '../shared/model.js';
import { palettes } from '../shared/themes.js';
import { SvgRenderer } from '../svg/renderer.js';
import { Effects, glowTexture, sourceGlows } from './effects.js';
import { isometricDrawing } from '../shared/isometric.js';
import { flatDrawing } from '../shared/flat.js';
import { lift, defaultAngle } from '../shared/camera.js';

class PixiRenderer {
  async init(viewport, hybrid) {
    this.viewport = viewport; this.hybrid = hybrid; this.calls = 0;
    if (hybrid) this.svg = new SvgRenderer(viewport, { effects: false });
    this.app = new Application();
    await this.app.init({ width: 600, height: 420, preference: 'webgl', autoStart: false, sharedTicker: false, backgroundAlpha: 0,
      antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
      eventFeatures: { move: true, globalMove: false, click: true, wheel: false } });
    this.app.stop(); this.app.canvas.className = `scene-canvas${hybrid ? ' effect-canvas' : ''}`;
    // Pixi's EventSystem registers a separate system ticker even when the app
    // ticker is stopped. We use static hit areas and native pointer moves, so
    // remove that polling listener too. Do not stop global tickers wholesale.
    EventsTicker.removeTickerListener();
    this.app.canvas.setAttribute('aria-hidden', 'true'); viewport.append(this.app.canvas);
    this.world = new Container({ label: 'ApartmentScene' }); this.app.stage.addChild(this.world);
    this.texture = glowTexture();
    // Static hit areas do not need Pixi's periodic idle-pointer updates.
    this.app.renderer.events.features.globalMove = false;
    const gl = this.app.renderer.gl;
    this.backend = `${hybrid ? 'SVG + ' : ''}${gl ? 'WebGL' : 'GPU'}`;
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    this.gpu = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER) ?? 'unknown';
    return this;
  }
  update(state) {
    this.state = state; this.svg?.update(state);
    for (const child of this.world.removeChildren()) child.destroy({ children: true });
    this.vacuum = null; this.hits = new Map(); const p = palettes[state.theme];
    const layers = new Map();
    for (const name of ['RoomLayer', 'FurnitureLayer', 'LightingLayer', 'DeviceLayer', 'EffectsLayer', 'InteractionLayer']) {
      const layer = new Container({ label: name }); this.world.addChild(layer); layers.set(name, layer);
    }
    const backlights=sourceGlows(state,this.texture,this.angle??defaultAngle,'back',this.mode);
    if (!this.hybrid) for (const object of (this.mode === '2d' ? flatDrawing(drawing(state,p),state,p) : isometricDrawing(drawing(state, p), state, p, this.angle ?? defaultAngle))) {
      const group = new Container({ label: object.id });
      group.alpha=object.opacity??1;
      for (const shape of object.shapes) group.addChild(this.shape(shape));
      layers.get(object.moving ? 'DeviceLayer' : object.layer === 'RoomLayer' ? 'RoomLayer' : 'FurnitureLayer').addChild(group); if (object.moving) this.vacuum = group;
      if(object.id==='cutaway-walls')layers.get('FurnitureLayer').addChild(backlights);
    }
    if(this.hybrid || this.mode==='2d')layers.get('FurnitureLayer').addChild(backlights);
    layers.get('EffectsLayer').addChild(sourceGlows(state,this.texture,this.angle??defaultAngle,'front',this.mode));
    this.effects = new Effects(state, p, this.texture); layers.get('LightingLayer').addChild(this.effects.root);
    const mask = scene.room.points ? new Graphics().poly(scene.room.points.flat()).fill('white') : new Graphics().roundRect(47, 51, 506, 312, 15).fill('white');
    layers.get('LightingLayer').addChild(mask); this.effects.root.mask = mask;
    // In hybrid mode the transparent GPU surface has no interaction listeners.
    if (!this.hybrid) for (const entity of scene.entities) {
      const elevated = lift(entity, this.mode === '2d' ? 0 : entity.z, this.angle ?? defaultAngle);
      const hit = new Container({ label: `hit:${entity.id}` }); hit.position.copyFrom(elevated); hit.entityId = entity.id;
      hit.eventMode = 'static'; hit.cursor = 'pointer'; hit.hitArea = new Circle(0, 0, entity.radius);
      const ring = new Graphics().circle(0, 0, entity.radius).fill({ color: p.accent, alpha: .08 }).stroke({ color: p.accent, width: 1.3 });
      ring.visible = false; ring.eventMode = 'none'; hit.addChild(ring);
      hit.on('pointerover', () => { ring.visible = true; this.invalidate?.(); }); hit.on('pointerout', () => { ring.visible = false; this.invalidate?.(); });
      layers.get('InteractionLayer').addChild(hit); this.hits.set(entity.id, hit);
    }
    this.layers = layers;
  }
  shape(s) {
    if (s.type === 'text') {
      const text = new Text({ text: s.value, style: { fontFamily: 'system-ui, sans-serif', fontSize: s.size, fill: s.fill, fontWeight: s.size >= 14 ? '600' : '500' }, resolution: 2 });
      text.anchor.set(.5, .8); text.position.set(s.x, s.y); text.eventMode = 'none'; return text;
    }
    const g = new Graphics();
    if (s.type === 'rect') g.roundRect(s.x, s.y, s.w, s.h, s.r);
    if (s.type === 'circle') g.circle(s.x, s.y, s.r);
    if (s.type === 'line') { g.moveTo(...s.points[0]); for (const point of s.points.slice(1)) g.lineTo(...point); }
    if (s.type === 'polygon') g.poly(s.points.flat());
    if (s.fill && s.fill !== 'none') g.fill(s.fill);
    if (s.stroke && s.stroke !== 'none' && s.sw) g.stroke({ color: s.stroke, width: s.sw, cap: 'round', join: 'round' });
    g.alpha = s.alpha ?? 1; g.eventMode = 'none'; return g;
  }
  frame(time) {
    this.svg?.frame(time); const pos = vacuumPosition(this.state, time);
    this.vacuum?.position.copyFrom(pos); this.hits.get('vacuum')?.position.copyFrom(lift(pos, this.mode === '2d' ? 0 : 8, this.angle ?? defaultAngle));
    if (this.vacuum && this.state.vacuum.state === 'error') this.vacuum.alpha = .72 + .28 * Math.cos(time * 4);
    this.effects.frame(time); this.app.render(); this.calls++;
  }
  camera(m, width, height) {
    if (this.angle !== m.angle || this.mode !== m.mode) { this.angle = m.angle; this.mode = m.mode; this.update(this.state); }
    this.svg?.camera(m, width, height);
    if (Math.abs(this.app.screen.width - width) > .5 || Math.abs(this.app.screen.height - height) > .5) this.app.renderer.resize(width, height);
    this.world.setFromMatrix(new Matrix(m.a, m.b, m.c, m.d, m.x, m.y));
  }
  hitTest(event) {
    if (this.svg) return this.svg.hitTest(event);
    const rect = this.app.canvas.getBoundingClientRect();
    const boundary = this.app.renderer.events.rootBoundary; boundary.rootTarget = this.app.stage;
    let hit = boundary.hitTest((event.clientX - rect.left) * this.app.screen.width / rect.width, (event.clientY - rect.top) * this.app.screen.height / rect.height);
    while (hit && !hit.entityId) hit = hit.parent;
    return hit?.entityId;
  }
  metrics() {
    const count = node => 1 + (node.children ?? []).reduce((n, c) => n + count(c), 0);
    return { backend: this.backend, gpu: this.gpu, objects: count(this.world) + (this.svg?.metrics().objects ?? 0),
      resolution: `${this.app.canvas.width}×${this.app.canvas.height} @${this.app.renderer.resolution}`, renderCalls: this.calls, tickerStarted: this.app.ticker.started, systemTickerListeners: Ticker.system.count };
  }
  destroy() { this.svg?.destroy(); this.app.destroy(true, { children: true }); this.texture.destroy(true); }
}
export async function createPixiRenderer(viewport, hybrid) {
  const renderer = new PixiRenderer();
  try { return await renderer.init(viewport, hybrid); }
  catch (error) {
    renderer.svg?.destroy();
    if (renderer.app?.renderer) renderer.app.destroy(true, { children: true });
    else renderer.app?.stage?.destroy({ children: true });
    renderer.texture?.destroy(true); throw error;
  }
}

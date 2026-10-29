import { Container, Graphics, Sprite, Texture, Matrix } from 'pixi.js';
import { scene, lightColor, lightState, vacuumPosition, vacuumTrail } from '../shared/model.js';
import { lightEmitters, emitterMatrix } from '../shared/emission.js';

// Build one reusable radial texture locally. The GPU scales/tints/blends it;
// the SVG implementation uses a native radialGradient instead.
export function glowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, '#ffffffff'); gradient.addColorStop(.35, '#ffffff8c'); gradient.addColorStop(1, '#ffffff00');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128); return Texture.from(canvas);
}
export function sourceGlows(state,texture,angle,placement,mode = '3d') {
  const root=new Container({label:`SourceGlows:${placement}`});root.eventMode='none';
  for(const source of lightEmitters().filter(s=>(s.placement??'front')===placement)) {
    const lamp=lightState(state,source.entity);if(!lamp.active || lamp.brightness<=0)continue;
    const group=new Container({label:`emitter:${source.id}`}),m=emitterMatrix(source,angle,mode);
    group.setFromMatrix(new Matrix(m.a,m.b,m.c,m.d,m.x,m.y));
    const sprite=new Sprite(texture);sprite.width=sprite.height=1;sprite.tint=lightColor(state,source.entity);sprite.alpha=lamp.brightness*(source.gain??.8);group.addChild(sprite);
    if(source.cutout) {
      const c=source.cutout,mask=new Graphics().rect(0,0,1,1).fill('white').rect(c.x,c.y,c.width,c.height).cut();
      group.addChild(mask);sprite.mask=mask;
    }
    root.addChild(group);
  }
  return root;
}
export class Effects {
  constructor(state, palette, texture) {
    this.state = state; this.root = new Container({ label: 'EffectsLayer' }); this.root.eventMode = 'none';
    this.anchors=Object.fromEntries(scene.entities.map(e=>[e.id,e]));const a=this.anchors;
    const glow = (x, y, width, height, tint, alpha) => {
      const sprite = new Sprite(texture); sprite.anchor.set(.5); sprite.position.set(x, y); sprite.width = width; sprite.height = height; sprite.tint = tint; sprite.alpha = alpha; this.root.addChild(sprite); return sprite;
    };
    if (a.light && state.light.active) glow(a.light.x, a.light.y, 310, 290, lightColor(state), state.light.brightness * .72);
    this.heat = []; this.air = [];
    this.trail = new Graphics(); this.trail.eventMode = 'none'; this.trailColor = palette.cool; this.root.addChild(this.trail);
    if (a.heating && state.heating.active) {
      glow(a.heating.x, a.heating.y-10, 115, 90, palette.heat, state.heating.level * .25);
      for (let i = 0; i < 4; i++) {
        const wave = new Graphics().moveTo(0, 0).bezierCurveTo(-9, -8, 9, -16, 0, -32).stroke({ color: palette.heat, width: 2 });
        wave.x = a.heating.x-25 + i * 15; this.heat.push(wave); this.root.addChild(wave);
      }
    }
    if (a.dehumidifier && state.dehumidifier.state === 'running' || a.window && state.window.state === 'open') for (let i = 0; i < 10; i++) {
      const particle = new Graphics().circle(0, 0, i % 2 ? 2 : 1.3).fill(palette.cool); this.air.push(particle); this.root.addChild(particle);
    }
    if (a.dehumidifier && state.dehumidifier.state === 'running') glow(a.dehumidifier.x, a.dehumidifier.y-30, 70, 90, palette.cool, .12);
    if (state.vacuum.state === 'cleaning' || state.vacuum.state === 'error') {
      this.robot = glow(0, 0, 76, 76, state.vacuum.state === 'error' ? '#ee625c' : palette.cool, .22);
      this.ring = new Graphics().circle(0, 0, 27).stroke({ color: state.vacuum.state === 'error' ? '#ee625c' : palette.cool, width: 1.3, alpha: .5 }); this.root.addChild(this.ring);
    }
    if (state.theme === 'blueprint' && (state.heating.active || state.dehumidifier.state === 'running' || state.vacuum.state === 'cleaning')) {
      this.scan = new Graphics().moveTo(46, 0).lineTo(554, 0).stroke({ color: palette.cool, width: 1, alpha: .3 }); this.root.addChild(this.scan);
    }
  }
  frame(time) {
    const route = vacuumTrail(this.state, time); this.trail.clear();
    for (let i=1;i<route.length;i++) if (i%3) this.trail.moveTo(route[i-1].x,route[i-1].y).lineTo(route[i].x,route[i].y);
    if (route.length>1) this.trail.stroke({color:this.trailColor,width:2,alpha:.65});
    this.heat.forEach((wave, i) => { const phase = (time * .55 + i * .23) % 1; wave.y = this.anchors.heating.y-10 - phase * 16; wave.alpha = (1 - phase) * this.state.heating.level; });
    this.air.forEach((particle, i) => {
      const phase = (time * .28 + i * .13) % 1;
      const a=this.anchors,window = this.state.window.state === 'open' && (i < 5 || this.state.dehumidifier.state !== 'running' || !a.dehumidifier);
      particle.position.set(window ? a.window.x-25 + i * 8 : a.dehumidifier.x + Math.sin(i * 2) * phase * 23, window ? a.window.y+10 + phase * 65 : a.dehumidifier.y-28 - phase * 56);
      particle.alpha = Math.sin(phase * Math.PI) * .7;
    });
    const pos = vacuumPosition(this.state, time);
    if (this.robot) { this.robot.position.copyFrom(pos); this.ring.position.copyFrom(pos); this.ring.scale.set(1 + .06 * Math.sin(time * 3)); }
    if (this.scan) this.scan.y = 52 + time * 22 % 308;
  }
}

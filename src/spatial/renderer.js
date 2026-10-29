import {Application,Container,Graphics,Sprite,Texture,Text,Matrix} from 'pixi.js';
import {geometry} from './geometry.js';
import {lift} from './camera.js';
import {deviceState} from './state.js';

export class SpatialRenderer {
 async init(element) {
  this.app=new Application();this.destroyed=false;
  await this.app.init({width:600,height:420,preference:'webgl',autoStart:false,sharedTicker:false,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,eventFeatures:{move:false,globalMove:false,click:false,wheel:false}});
  if(this.destroyed){this.app.destroy(true,{children:true});return;}
  this.app.stop();this.app.canvas.setAttribute('aria-hidden','true');this.app.canvas.style.cssText='display:block;width:100%;height:100%;pointer-events:none';element.prepend(this.app.canvas);
  this.world=new Container();this.app.stage.addChild(this.world);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'#ffffffe6');gradient.addColorStop(.4,'#ffffff70');gradient.addColorStop(1,'#ffffff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);this.texture=Texture.from(canvas);
 }
 shape(s) {
  if(s.type==='text'){const text=new Text({text:String(s.value??''),style:{fontFamily:'system-ui',fontSize:s.size??10,fill:s.fill??'#344a40'},resolution:2});text.anchor.set(.5,.8);text.position.set(s.x,s.y);return text;}
  const g=new Graphics();
  if(s.type==='rect')g.roundRect(s.x,s.y,s.w,s.h,s.r??0);
  if(s.type==='circle')g.circle(s.x,s.y,s.r);
  if(s.type==='polygon'&&s.points?.length)g.poly(s.points.flat());
  if(s.type==='line'&&s.points?.length){g.moveTo(...s.points[0]);for(const p of s.points.slice(1))g.lineTo(...p);}
  if(s.fill&&s.fill!=='none')g.fill(s.fill);
  if(s.stroke&&s.stroke!=='none'&&s.sw)g.stroke({color:s.stroke,width:s.sw,cap:'round',join:'round'});
  g.alpha=s.alpha??1;return g;
 }
 update(scene,states,p,camera) {
  this.scene=scene;this.states=states;this.cameraState={...camera};
  for(const child of this.world.removeChildren())child.destroy({children:true});
  this.heat=[];this.air=[];this.hitShapes=new Map();
  const back=new Container(),front=new Container(),effects=new Container();
  const devices=new Map((scene.devices??[]).map(d=>[d.id,d]));
  for(const source of scene.emitters??[]) {
   const device=devices.get(source.entity??source.device),s=device?deviceState(device,states):null;if(!s?.active||s.brightness<=0)continue;
   const {x,y,width,height}=source,z=camera.mode==='2d'?0:source.z??0,angle=camera.angle;
   const a=source.axis??[1,0],flat=camera.mode==='2d',panel=source.kind==='panel'&&!flat;
   const p0=panel?lift({x:x-a[0]*width/2,y:y-a[1]*width/2},z+height/2,angle):lift({x:x-width/2,y:y-height/2},z,angle);
   const p1=panel?lift({x:x+a[0]*width/2,y:y+a[1]*width/2},z+height/2,angle):lift({x:x+width/2,y:y-height/2},z,angle);
   const p3=panel?lift({x:x-a[0]*width/2,y:y-a[1]*width/2},z-height/2,angle):lift({x:x-width/2,y:y+height/2},z,angle);
   const group=new Container(),sprite=new Sprite(this.texture);sprite.width=sprite.height=1;sprite.tint=s.color;sprite.alpha=s.brightness*(source.gain??.7);group.addChild(sprite);group.setFromMatrix(new Matrix(p1.x-p0.x,p1.y-p0.y,p3.x-p0.x,p3.y-p0.y,p0.x,p0.y));
   if(source.cutout&&panel){const c=source.cutout,mask=new Graphics().rect(0,0,1,1).fill('white').rect(c.x,c.y,c.width,c.height).cut();group.addChild(mask);sprite.mask=mask;}
   (source.placement==='back'?back:front).addChild(group);
  }
  for(const object of geometry(scene,states,p,camera)) {
   if(object.device){const old=this.hitShapes.get(object.device)??[];this.hitShapes.set(object.device,[...old,...object.shapes.filter(shape=>shape.interactive!==false&&shape.alpha!==0)]);}
   const group=new Container({label:object.id});group.alpha=object.opacity??1;
   for(const shape of object.shapes)group.addChild(this.shape(shape));this.world.addChild(group);
   if(object.id==='cutaway-walls')this.world.addChild(back);
  }
  if(camera.mode==='2d')this.world.addChild(back);
  for(const device of scene.devices??[]) {
   const s=deviceState(device,states),point=lift(device,camera.mode==='2d'?0:device.z??0,camera.angle);
   if(['radiator','climate'].includes(device.type)&&s.heating)for(let i=0;i<3;i++){const wave=new Graphics().moveTo(0,0).bezierCurveTo(-5,-5,5,-13,0,-23).stroke({color:p.heat,width:1.8});wave.x=point.x-13+i*13;effects.addChild(wave);this.heat.push({wave,y:point.y,index:i});}
   if(device.type==='vacuum' || device.type==='outlet'){
    const g=new Graphics().circle(point.x,point.y,device.type==='vacuum'?Math.min(12,device.radius??12):Math.min(5,(device.radius??14)*.35)).fill(s.available?(device.type==='outlet'?p.device:p.cushion):p.rug).stroke({color:p.wall,width:1.6});
    if(device.type==='outlet')g.circle(point.x-1.6,point.y,.8).circle(point.x+1.6,point.y,.8).fill(p.wall);
    else g.circle(point.x,point.y-2,3).stroke({color:p.wall,width:1});effects.addChild(g);
   }
  }
  this.world.addChild(effects,front);this.focus=new Graphics();this.world.addChild(this.focus);
 }
 transform(m,width,height) {
  if(Math.abs(this.app.screen.width-width)>.5||Math.abs(this.app.screen.height-height)>.5)this.app.renderer.resize(width,height);
  this.world.setFromMatrix(new Matrix(m.a,m.b,m.c,m.d,m.x,m.y));
 }
 hover(device,palette) {
  this.focus.clear();if(!device)return;
  const p=lift(device,this.cameraState.mode==='2d'?0:device.z??0,this.cameraState.angle);
  this.focus.circle(p.x,p.y,device.radius??19).fill({color:palette.cool,alpha:.12}).stroke({color:palette.cool,width:1.4});
 }
 frame(time) {for(const {wave,y,index} of this.heat){const phase=(time*.5+index*.3)%1;wave.y=y-phase*13;wave.alpha=1-phase;}this.app.render();}
 destroy() {this.destroyed=true;if(this.app?.renderer)this.app.destroy(true,{children:true});this.texture?.destroy(true);}
}

import {element,svgElement} from '../design/dom.js';
import {applyTheme} from '../design/tokens.js';
import {appearanceMode} from '../core/state.js';
import {resolveLanguage,localized} from '../core/i18n.js';
import {spatialStyles} from '../spatial/styles.js';
import {deviceState,number,perform,validateSpatial,clamp} from '../spatial/state.js';
import {palettes} from '../spatial/palette.js';
import {matrix,project,placeOverlay,zoomAt,rotateAt,defaultAngle} from '../spatial/camera.js';
import {geometryHit} from '../spatial/hit-test.js';
import {sensorAnchor} from '../spatial/geometry.js';

export class MufflonbauSpatial extends HTMLElement {
 constructor(){super();this.attachShadow({mode:'open'});this.camera={x:300,y:210,zoom:1,mode:'2d',angle:0};this.theme='storybook';this._epoch=0;this.time=0;this.visible=true;}
 setConfig(config){validateSpatial(config.spatial);this._config=config;this.sceneId=config.spatial.default_scene??config.spatial.scenes[0].id;this.focusRoom='all';if(!config.spatial.enable_3d)this.camera={...this.camera,mode:'2d',angle:0};this.watched=[...new Set(config.spatial.scenes.flatMap(s=>[...(s.devices??[]).flatMap(d=>[d.entity,d.power,d.energy,d.energy_today]),...(s.readings??[]).flatMap(r=>[r.temperature,r.humidity])]).filter(Boolean))];if(this.renderer){this.closePopup(false);this.buildLegend();this.update();}else this._ensure();}
 set hass(hass){const old=this._hass;this._hass=hass;this.language=resolveLanguage(this._config??{},hass);if(this.fallbackCard){this.fallbackCard.hass=hass;return;}if(!this.renderer){this._ensure();return;}if(!old||old.themes!==hass.themes||old.states['sun.sun']!==hass.states['sun.sun']||this.watched.some(id=>old.states[id]!==hass.states[id]))this.update();}
 get de(){return this.language!=='en';}
 t(de,en){return this.de?de:en;}
 connectedCallback(){this._ensure();}
 disconnectedCallback(){this._epoch++;this.closePopup(false);clearTimeout(this.holdTimer);cancelAnimationFrame(this.raf);this.abort?.abort();this.resizeObserver?.disconnect();this.intersectionObserver?.disconnect();this.renderer?.destroy();this.renderer=null;this.fallbackCard=null;this.initializing=false;}
 async _ensure(){
  if(!this.isConnected||!this._config||!this._hass||this.renderer||this.initializing)return;
  this.initializing=true;const epoch=++this._epoch;this.abort=new AbortController();
  const root=element('section',undefined,'workspace');
  this.viewport=element('div',undefined,'viewport');this.viewport.tabIndex=0;this.viewport.setAttribute('aria-label',this.t('Interaktive Wohnungskarte','Interactive apartment map'));
  this.stage=element('section',undefined,'stage');this.mapTitle=element('h1',undefined,'map-title');this.stage.append(this.viewport,this.mapTitle);
  this.legend=element('section',undefined,'legend');this.legend.setAttribute('aria-label',this.t('Kartenlegende','Map legend'));root.append(this.stage,this.legend);
  this.shadowRoot.replaceChildren(element('style',spatialStyles),root);this.buildLegend();
  this.resizeObserver=new ResizeObserver(()=>this.draw());this.resizeObserver.observe(this.viewport);
  this.intersectionObserver=new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting;this.reconcile();if(this.visible)this.draw();});this.intersectionObserver.observe(this);
  document.addEventListener('visibilitychange',()=>{this.reconcile();if(!document.hidden)this.draw();},{signal:this.abort.signal});
  window.addEventListener('scroll',()=>this.positionPopup(),{capture:true,passive:true,signal:this.abort.signal});window.addEventListener('resize',()=>this.positionPopup(),{signal:this.abort.signal});
  let renderer;
  try{
   const {SpatialRenderer}=await import('../spatial/renderer.js');if(epoch!==this._epoch)return;
   renderer=new SpatialRenderer();await renderer.init(this.viewport);if(epoch!==this._epoch){renderer.destroy();return;}
   this.renderer=renderer;this.initializing=false;this.bindInteractions();this.update();this.dataset.ready='true';
  }catch(error){renderer?.destroy();if(epoch!==this._epoch)return;this.initializing=false;this.dataset.ready='fallback';this.rendererError=error.message;this.showFallback(error);}
 }
 get scene(){return this._config.spatial.scenes.find(s=>s.id===this.sceneId)??this._config.spatial.scenes[0];}
 buildLegend(){
  const l=this.legend;l.replaceChildren(element('h2',this.t('Kartenansicht','Map view')));
  const group=label=>{const section=element('div');section.append(element('span',label,'legend-label'));l.append(section);return section;};
  const modes=element('div',undefined,'segmented');for(const mode of this._config.spatial.enable_3d?['2d','3d']:['2d']){const b=element('button',mode.toUpperCase());b.dataset.projection=mode;b.setAttribute('aria-pressed',String(this.camera.mode===mode));b.onclick=()=>{this.camera={...this.camera,mode,angle:mode==='2d'?0:defaultAngle};for(const n of modes.children)n.setAttribute('aria-pressed',String(n===b));this.update();};modes.append(b);}group(this.t('Perspektive','Perspective')).append(modes);
  const rooms=element('div',undefined,'rooms');for(const s of [{id:'all',label:this.scene.label},...(this._config.spatial.focus_rooms??[])]){const b=element('button',localized(s.label??s.id,this.language));b.dataset.scene=s.id;b.setAttribute('aria-pressed',String(s.id===this.focusRoom));b.onclick=()=>{this.closePopup(false);this.focusRoom=s.id;this.camera={...this.camera,x:s.x??300,y:s.y??210,zoom:s.zoom??1};this.buildLegend();this.update();};rooms.append(b);}group(this.t('Räume','Rooms')).append(rooms);
  const themes=element('div',undefined,'segmented');for(const [id,name]of [['storybook','Storybook'],['blueprint','Blueprint']]){const b=element('button',name);b.setAttribute('aria-pressed',String(id===this.theme));b.onclick=()=>{this.theme=id;for(const n of themes.children)n.setAttribute('aria-pressed',String(n===b));this.update();};themes.append(b);}group(this.t('Darstellung','Appearance')).append(themes);
  const status=element('div',undefined,'legend-status');for(const text of [this.t('Licht eingeschaltet','Light on'),this.t('Heizung aktiv','Heating active'),this.t('Fenster offen','Window open')])status.append(element('span',text));group(this.t('Legende','Legend')).append(status);
  const tools=element('div',undefined,'tools');for(const [label,factor]of [['−',.8],['+',1.25],['↺',0]]){const b=element('button',label);b.setAttribute('aria-label',factor===0?this.t('Karte zurücksetzen','Reset map'):factor<1?this.t('Verkleinern','Zoom out'):this.t('Vergrößern','Zoom in'));b.onclick=()=>{this.camera=factor?{...this.camera,zoom:clamp(this.camera.zoom*factor,.65,4,.01)}:{...this.camera,x:300,y:210,zoom:1,angle:this.camera.mode==='2d'?0:defaultAngle};this.draw();};tools.append(b);}group(this.t('Kartenausschnitt','Viewport')).append(tools);
  this.deviceList=element('details',undefined,'devices');this.deviceList.append(element('summary',this.t('Geräte bedienen','Device controls')),element('div'));l.append(this.deviceList);
  l.append(element('div',this.t('Tippen schaltet Licht und Heizung. Halten öffnet die Regler. Steckdosen schalten nur nach Bestätigung. Zwei Finger: zoomen und drehen. Rechte Maustaste halten: drehen.','Tap to toggle lights and heating. Hold for controls. Outlets always ask for confirmation. Two fingers: zoom and rotate. Hold right mouse button to rotate.'),'help'));
 }
 update(){
  if(!this.renderer||!this.isConnected)return;
  const mode=appearanceMode(this._config.appearance,this._hass.states,this._hass.themes?.darkMode);applyTheme(this,mode,this._config.appearance?.theme);this.palette=palettes[this.theme==='blueprint'?'blueprint':mode==='night'?'night':'storybook'];this.shadowRoot.querySelector('.workspace').classList.toggle('blueprint',this.theme==='blueprint');
  this.mapTitle.replaceChildren(document.createTextNode(localized(this.scene.label??this.scene.id,this.language)),element('small',this.t('Licht · Wärme · Zuhause','Light · warmth · home')));
  this.renderer.update(this.scene,this._hass.states,this.palette,this.camera);this.geometryAngle=this.camera.angle;this.geometryMode=this.camera.mode;
  this.sensorNodes?.forEach(n=>n.node.remove());this.sensorNodes=(this.scene.readings??[]).map(reading=>{const node=element('div',undefined,'sensor-frame');node.setAttribute('aria-label',localized(reading.label??'',this.language));this.stage.append(node);return {node,reading};});
  const list=this.deviceList.querySelector('div');list.replaceChildren();for(const d of this.scene.devices??[]){if(!d.entity)continue;const b=element('button',localized(d.name??d.id,this.language));b.dataset.device=d.id;b.onclick=()=>this.openPopup(d);list.append(b);}
  this.refreshPopup();this.draw();this.reconcile();
 }
 draw(){
  if(!this.renderer||!this.isConnected||!this.visible||document.hidden)return;
  const {width,height}=this.viewport.getBoundingClientRect();if(!width||!height)return;
  if(this.geometryAngle!==this.camera.angle||this.geometryMode!==this.camera.mode){this.renderer.update(this.scene,this._hass.states,this.palette,this.camera);this.geometryAngle=this.camera.angle;this.geometryMode=this.camera.mode;}
  this.transform=matrix(width,height,this.camera);this.renderer.transform(this.transform,width,height);this.renderer.frame(this.time);
  for(const {node,reading}of this.sensorNodes??[]){const subscene=reading.room?reading:this.scene,p=project(sensorAnchor(subscene,this.camera),this.transform);node.classList.toggle('is-plan',this.camera.mode==='2d');node.replaceChildren(element('small',localized(reading.label??'',this.language)),document.createTextNode(`${this.measure(reading.temperature,'°C')} · ${this.measure(reading.humidity,'%')}`));node.style.left=`${clamp(p.x,Math.min(width/2,90),Math.max(width/2,width-90))}px`;node.style.top=`${clamp(p.y,35,Math.max(35,height-25))}px`;}
  this.positionPopup();
 }
 measure(id,unit){if(!id)return `— ${unit}`;const s=this._hass.states[id],v=number(s);if(v===null)return `${s?.state==='unavailable'?this.t('Nicht verfügbar','Unavailable'):s?.state==='unknown'?this.t('Unbekannt','Unknown'):this.t('Fehlt','Missing')} ${unit}`;return `${new Intl.NumberFormat(this.language,{maximumFractionDigits:1}).format(v)} ${s.attributes?.unit_of_measurement??unit}`;}
 reconcile(){cancelAnimationFrame(this.raf);this.last=0;if(!this.renderer||!this.visible||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches||!this.renderer.heat?.length)return;const tick=now=>{if(this.last)this.time+=Math.min(.1,(now-this.last)/1000);this.last=now;this.draw();this.raf=requestAnimationFrame(tick);};this.raf=requestAnimationFrame(tick);}
 point(d){return project({...d,z:this.camera.mode==='2d'?0:d.z??0},this.transform);}
 hit(e){if(!this.transform)return null;const r=this.viewport.getBoundingClientRect(),point={x:e.clientX-r.left,y:e.clientY-r.top};const actual=(this.scene.devices??[]).filter(d=>geometryHit(point,this.renderer.hitShapes?.get(d.id)??[],this.transform));if(actual.length)return actual.sort((a,b)=>{const x=this.point(a),y=this.point(b);return Math.hypot(point.x-x.x,point.y-x.y)-Math.hypot(point.x-y.x,point.y-y.y);})[0];return (this.scene.devices??[]).map(d=>({d,p:this.point(d)})).map(v=>({...v,distance:Math.hypot(e.clientX-r.left-v.p.x,e.clientY-r.top-v.p.y)})).filter(v=>v.distance<=Math.max(18,(v.d.radius??19)*this.transform.scale)).sort((a,b)=>a.distance-b.distance)[0]?.d;}
 bindInteractions(){
  const pointers=new Map(),on=(name,fn,options={})=>this.viewport.addEventListener(name,fn,{signal:this.abort.signal,...options});let gesture;
  const sample=()=>{const [a,b]=[...pointers.values()];return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y),angle:Math.atan2(b.y-a.y,b.x-a.x)}:{...a,distance:0};};
  on('pointerdown',e=>{if(![0,2].includes(e.button))return;const r=this.viewport.getBoundingClientRect();pointers.set(e.pointerId,{x:e.clientX-r.left,y:e.clientY-r.top});if(pointers.size>1){clearTimeout(this.holdTimer);gesture.fader=null;gesture.moved=true;gesture.last=sample();return;}const target=e.button===2?null:this.hit(e);gesture={target,orbit:e.button===2,start:sample(),last:sample(),moved:false};this.viewport.setPointerCapture(e.pointerId);if(target)this.holdTimer=setTimeout(()=>{if(!gesture)return;gesture.held=true;this.openPopup(target);const s=deviceState(target,this._hass.states);if(s.available&&(target.type==='light'&&s.dimmable||target.type==='radiator'||target.type==='climate')){gesture.fader=target.type==='light'?'brightness':'temperature';gesture.initial=gesture.fader==='brightness'?Math.round(s.brightness*100):s.target??s.min;gesture.value=gesture.initial;}},480);});
  on('pointermove',e=>{
   if(!pointers.has(e.pointerId)){const d=this.hit(e);if(this.hovered!==d?.id){this.hovered=d?.id;this.viewport.style.cursor=d?'pointer':'grab';this.renderer.hover(d,this.palette);this.draw();}return;}
   const r=this.viewport.getBoundingClientRect();pointers.set(e.pointerId,{x:e.clientX-r.left,y:e.clientY-r.top});if(!gesture)return;const next=sample();
   if(gesture.held&&gesture.fader&&pointers.size===1){const s=deviceState(gesture.target,this._hass.states);gesture.value=gesture.fader==='brightness'?clamp(gesture.initial-(next.y-gesture.start.y)/1.7,0,100):clamp(gesture.initial-(next.y-gesture.start.y)/12,s.min,s.max,s.step);const input=this.popup?.querySelector(`[data-setting="${gesture.fader}"]`);if(input){input.value=gesture.value;input.dispatchEvent(new Event('input'));}return;}
   if(!gesture.moved&&Math.hypot(next.x-gesture.start.x,next.y-gesture.start.y)<6)return;clearTimeout(this.holdTimer);gesture.moved=true;
   if(gesture.orbit)this.camera=rotateAt(this.camera,-(next.x-gesture.last.x)*.009,{x:r.width/2,y:r.height/2},r.width,r.height);
   else{if(next.distance&&gesture.last.distance){this.camera=zoomAt(this.camera,next.distance/gesture.last.distance,gesture.last,r.width,r.height);this.camera=rotateAt(this.camera,Math.atan2(Math.sin(next.angle-gesture.last.angle),Math.cos(next.angle-gesture.last.angle)),gesture.last,r.width,r.height);}const m=matrix(r.width,r.height,this.camera),det=m.a*m.d-m.b*m.c,dx=next.x-gesture.last.x,dy=next.y-gesture.last.y;this.camera={...this.camera,x:this.camera.x-(m.d*dx-m.c*dy)/det,y:this.camera.y-(-m.b*dx+m.a*dy)/det};}
   gesture.last=next;this.draw();
  });
  const up=e=>{if(!pointers.has(e.pointerId))return;clearTimeout(this.holdTimer);pointers.delete(e.pointerId);if(e.type!=='pointerup'){gesture=null;pointers.clear();return;}if(pointers.size){gesture.last=sample();return;}if(gesture?.held&&gesture.fader&&gesture.value!==gesture.initial)this.act(gesture.target,{type:gesture.fader,value:gesture.value});else if(gesture&&!gesture.moved&&!gesture.held&&!gesture.orbit){const d=gesture.target;if(d){if(d.type==='light')this.act(d,{type:'toggle'});else if(['radiator','climate'].includes(d.type)){this.openPopup(d);this.act(d,{type:'toggle'});}else this.openPopup(d);}else this.closePopup(false);}gesture=null;};
  for(const name of ['pointerup','pointercancel','lostpointercapture'])on(name,up);
  on('contextmenu',e=>e.preventDefault());on('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const r=this.viewport.getBoundingClientRect();this.camera=zoomAt(this.camera,Math.exp(-e.deltaY*.008),{x:e.clientX-r.left,y:e.clientY-r.top},r.width,r.height);this.draw();},{passive:false});
  on('keydown',e=>{if(e.key==='Escape')this.closePopup();if(['+','-'].includes(e.key)){e.preventDefault();this.camera={...this.camera,zoom:clamp(this.camera.zoom*(e.key==='+'?1.2:1/1.2),.65,4,.01)};this.draw();}});
 }
 openPopup(device){
  this.closePopup(false);this.selected=device;this.popup=element('section',undefined,'popup');this.popup.setAttribute('role','dialog');this.popup.setAttribute('aria-label',localized(device.name??device.id,this.language));
  const header=element('header');const close=element('button','×');close.setAttribute('aria-label',this.t('Details schließen','Close details'));close.onclick=()=>this.closePopup();header.append(element('strong',localized(device.name??device.id,this.language)),close);this.popup.append(header,element('p',undefined,'popup-state'));
  const s=deviceState(device,this._hass.states),range=(title,key,min,max,step,value,unit)=>{const label=element('label'),row=element('span',title),output=element('output');row.append(output);const input=element('input');Object.assign(input,{type:'range',min,max,step,value:value??min});input.dataset.setting=key;input.setAttribute('aria-label',title);input.oninput=()=>{output.textContent=`${input.value} ${unit}`;};input.onchange=()=>this.act(device,{type:key,value:Number(input.value)});input.oninput();label.append(row,input);this.popup.append(label);};
  const button=(label,intent,parent=this.popup)=>{const b=element('button',label);b.dataset.intent=intent.type;b.onclick=()=>this.act(device,intent);parent.append(b);return b;};
  const domain=device.entity?.split('.')[0];
  if(domain==='light'){
   if(s.dimmable)range(this.t('Helligkeit','Brightness'),'brightness',0,100,1,Math.round(s.brightness*100),'%');
   if(s.temperatureColor)range(this.t('Lichtfarbe','Color temperature'),'kelvin',s.minKelvin,s.maxKelvin,1,s.kelvin,'K');
   if(s.colorable){const label=element('label',this.t('Farbe','Color')),input=element('input');input.type='color';input.value=s.color;input.dataset.setting='color';input.onchange=()=>this.act(device,{type:'color',value:input.value});label.append(input);this.popup.append(label);}
   button(this.t('Licht umschalten','Toggle light'),{type:'toggle'});
  }
  if(domain==='climate'){if(Number.isFinite(s.target))range(this.t('Solltemperatur','Target temperature'),'temperature',s.min,s.max,s.step,s.target,s.raw.attributes.temperature_unit??'°C');button(this.t('Heizung umschalten','Toggle heating'),{type:'toggle'});}
  if(domain==='switch')button(this.t('Stromversorgung umschalten …','Switch power supply …'),{type:'toggle'});
  if(domain==='vacuum'){
   const actions=element('div',undefined,'actions');this.popup.append(actions);for(const [label,type,feature]of [[this.t('Start / Weiter','Start / Resume'),'start',8192],[this.t('Pause','Pause'),'pause',4],[this.t('Zur Station','Return to dock'),'return_to_base',16],[this.t('Stopp','Stop'),'stop',8]])if(s.raw?.attributes.supported_features&feature)button(label,{type},actions);
   const speeds=s.raw?.attributes.fan_speed_list;if(speeds?.length){const label=element('label',this.t('Saugstufe','Fan speed')),select=element('select');for(const speed of speeds){const o=element('option',speed);o.value=speed;select.append(o);}select.value=s.raw.attributes.fan_speed;select.onchange=()=>this.act(device,{type:'fan_speed',value:select.value});label.append(select);this.popup.append(label);}
  }
  const more=element('button',this.t('Alle Gerätedetails','All device details'));more.onclick=()=>this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:device.entity},bubbles:true,composed:true}));more.disabled=!device.entity;this.popup.append(more);
  this.message=element('p',undefined,'pending');this.message.setAttribute('role','status');this.popup.append(this.message);
  this.popup.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();this.closePopup();}};
  this.connector=svgElement('svg',{class:'connector'});this.connector.append(svgElement('line'));this.stage.append(this.connector,this.popup);this.refreshPopup();close.focus({preventScroll:true});
 }
 refreshPopup(){
  if(!this.popup)return;const s=deviceState(this.selected,this._hass.states);this.popup.querySelector('.popup-state').textContent=s.available?`${s.raw.state}${s.type==='light'?` · ${Math.round(s.brightness*100)} %`:''}${s.power!==null?` · ${s.power} W`:''}${s.energyToday!==null?` · ${s.energyToday} kWh ${this.t('heute','today')}`:''}${s.energy!==null?` · ${s.energy} kWh ${this.t('gesamt','total')}`:''}`:s.status==='unavailable'?this.t('Gerät nicht verfügbar','Device unavailable'):s.status==='unknown'?this.t('Gerätezustand unbekannt','Device state unknown'):this.t('Gerät fehlt','Device missing');
  for(const input of this.popup.querySelectorAll('[data-setting]')){input.disabled=!s.available||this.pending;if(this.shadowRoot.activeElement===input)continue;const value={brightness:Math.round(s.brightness*100),temperature:s.target,kelvin:s.kelvin,color:s.color}[input.dataset.setting];if(value!==undefined){input.value=value;input.dispatchEvent(new Event('input'));}}
  for(const b of this.popup.querySelectorAll('[data-intent]'))b.disabled=!s.available||this.pending;
  this.positionPopup();
 }
 async act(device,intent){
  if(this.pending)return;this.pending=true;this.refreshPopup();
  try{const ok=await perform(this._hass,device,intent,on=>this.confirmOutlet(device,on));if(this.message)this.message.textContent=ok?this.t('Befehl gesendet. Status wird von Home Assistant bestätigt.','Command sent. Waiting for Home Assistant state.'):'';}
  catch{if(!this.popup)this.openPopup(device);this.message.className='error';this.message.textContent=this.t('Befehl fehlgeschlagen. Der Gerätezustand bleibt unverändert.','Command failed. Device state remains unchanged.');}
  finally{this.pending=false;this.refreshPopup();}
 }
 confirmOutlet(device,on){
  if(!this.popup||this.selected?.id!==device.id)this.openPopup(device);
  return new Promise(resolve=>{this.confirmResolve=resolve;const confirm=element('section',undefined,'confirm');confirm.setAttribute('role','alertdialog');confirm.setAttribute('aria-label',this.t('Stromversorgung bestätigen','Confirm power supply'));
   confirm.append(element('strong',on?this.t('Strom sicher einschalten?','Are you sure you want to turn power on?'):this.t('Strom sicher abschalten?','Are you sure you want to turn power off?')),element('p',`${localized(device.name??device.id,this.language)} · ${this.t('Alle angeschlossenen Geräte sind betroffen.','Affects all connected devices.')}`));
   const actions=element('div',undefined,'actions'),cancel=element('button',this.t('Abbrechen','Cancel')),accept=element('button',on?this.t('Ja, einschalten','Yes, turn on'):this.t('Ja, abschalten','Yes, turn off'));
   cancel.dataset.confirm='cancel';accept.dataset.confirm='accept';const finish=value=>{this.confirmResolve=null;confirm.remove();resolve(value);};cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);actions.append(cancel,accept);confirm.append(actions);this.popup.append(confirm);this.positionPopup();cancel.focus({preventScroll:true});
  });
 }
 positionPopup(){if(!this.popup||!this.transform)return;const rect=this.viewport.getBoundingClientRect(),p=this.point(this.selected),anchor={x:rect.left+p.x,y:rect.top+p.y},pos=placeOverlay(anchor,{width:innerWidth,height:innerHeight},{width:this.popup.offsetWidth,height:this.popup.offsetHeight});Object.assign(this.popup.style,{left:`${pos.x}px`,top:`${pos.y}px`});for(const [key,v]of Object.entries({x1:p.x,y1:p.y,x2:pos.x+pos.width/2-rect.left,y2:pos.y+this.popup.offsetHeight/2-rect.top}))this.connector.firstChild.setAttribute(key,v);}
 closePopup(focus=true){if(this.confirmResolve){this.confirmResolve(false);this.confirmResolve=null;}const id=this.selected?.id;this.popup?.remove();this.connector?.remove();this.popup=null;this.message=null;this.selected=null;if(focus&&id)this.deviceList?.querySelector(`[data-device="${id}"]`)?.focus({preventScroll:true});}
 showFallback(){this.viewport.remove();this.mapTitle.remove();this.legend.hidden=true;this.shadowRoot.querySelector('.workspace').style.gridTemplateColumns='1fr';const note=element('p',this.t('3D-Grafik nicht verfügbar. Die klassische Karte bleibt bedienbar.','3D graphics unavailable. The classic map remains available.'),'fallback-note'),card=element('mufflonbau-live');card.className='fallback';card.setConfig({...this._config.fallback,type:'custom:mufflonbau-live',mode:'floorplan',language:this.language});card.hass=this._hass;this.stage.append(note,card);this.fallbackCard=card;}
 getCardSize(){return 8;}
}

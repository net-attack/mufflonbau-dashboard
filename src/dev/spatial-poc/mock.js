import {spatialFixture,spatialHass} from '../../../scripts/spatial-fixture.mjs';
// Development composition of the existing dashboard shell, unchanged production
// cards and an embedded Pixi map. No HA connection and no production imports.
await customElements.whenDefined('mufflonbau-shell');
const {config,hass}=await (await fetch('/dev/spatial-poc/mock-fixture.json')).json();
let productionSpatial=spatialFixture,productionStates=structuredClone(spatialHass.states),mapCard;
const simulatedHass={...hass,callService:async()=>{},callWS:async()=>({})};
const dashboard=await customElements.get('ll-strategy-dashboard-mufflonbau').generate(config,simulatedHass);
const shell=document.querySelector('#dashboard');
const params=new URL(location.href).searchParams;
let room=params.get('room')??'living',projection='2d',theme='storybook',frame;
let rooms=[{id:'living',label:'Wohnzimmer'}];
if(params.get('profile')==='local') {
 const response=await fetch('/dev/spatial-poc/profile.local.json');
 if(response.ok){const data=await response.json();if(data.production){productionSpatial=data.production.spatial;productionStates=data.production.states;}rooms=(data.rooms??[data]).map(r=>({id:r.id??'living',label:r.label}));room=params.get('room')??rooms[0].id;}
}
function productionMap(){
 const card=document.createElement('mufflonbau-spatial');card.id='production-map-mock';card.style.cssText='height:100%;display:block';card.setConfig({spatial:productionSpatial,appearance:{theme:'storybook'},language:'de',focus_room:params.get('room')??productionSpatial.default_scene,fallback:{rooms:[]}});
 let states=structuredClone(productionStates);
 const mockHass=()=>({...hass,states,callService:async(domain,service,data,target)=>{
  const id=target.entity_id,old=states[id];if(!old)return;const a={...old.attributes};let value=old.state;
  if(service==='turn_on')value='on';if(service==='turn_off')value='off';
  if(data.brightness_pct!==undefined)a.brightness=Math.round(data.brightness_pct*2.55);
  if(data.rgb_color)a.rgb_color=data.rgb_color;if(data.color_temp_kelvin)a.color_temp_kelvin=data.color_temp_kelvin;
  if(data.temperature!==undefined)a.temperature=data.temperature;if(data.hvac_mode)value=data.hvac_mode;
  states={...states,[id]:{...old,state:value,attributes:a}};card.hass=mockHass();
 }});card.hass=mockHass();mapCard=card;return card;
}
const style=`
:host{--mock-surface:var(--mb-surface,#fffdf3)}
.mock-map{position:relative;min-width:0;overflow:hidden;background:var(--mock-surface);border:1px solid var(--mb-line);border-radius:24px}
.mock-map iframe{border:0;width:100%;height:100%;display:block;background:transparent}
.mock-preview{height:280px;margin-top:12px}.mock-preview-link{position:absolute;bottom:12px;right:14px;border:1px solid var(--mb-line);background:var(--mock-surface);color:var(--mb-ink);padding:10px 14px;border-radius:14px;cursor:pointer;font:600 11px system-ui}
:host([data-view=rooms]) .shell{height:100dvh;min-height:0}
:host([data-view=rooms]) main{height:100dvh;min-height:0;padding:22px 24px 120px;max-width:none}
:host([data-view=rooms]) .content{display:block;height:100%}
.spatial-workspace{display:grid;grid-template-columns:minmax(0,1fr) 244px;gap:16px;height:100%;min-height:0}
.spatial-stage{display:flex;flex-direction:column;min-height:0}.spatial-stage .mock-map{flex:1;min-height:0}
.spatial-title{display:flex;justify-content:space-between;align-items:center;margin:0 0 12px;padding:0 3px}.spatial-title h1{font-size:24px;letter-spacing:-.6px;margin:0}.spatial-title p{margin:4px 0 0;font-size:12px;color:var(--mb-muted)}.spatial-title>span{font:10px ui-monospace,monospace;color:var(--mb-muted);letter-spacing:1px}
.spatial-legend{border:1px solid var(--mb-line);background:var(--mock-surface);border-radius:24px;padding:22px 18px;display:flex;flex-direction:column;gap:21px;overflow:auto;color:var(--mb-ink);font:12px system-ui}
.spatial-legend h2{font-size:17px;margin:0}.legend-label{display:block;font-size:10px;color:var(--mb-muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:9px}
.spatial-switch{display:flex;gap:5px;padding:4px;border-radius:14px;background:var(--mb-soft)}.spatial-switch button{flex:1;border:0;background:transparent;border-radius:10px;padding:10px 8px;color:var(--mb-muted);cursor:pointer;font:600 12px system-ui}.spatial-switch button[aria-pressed=true]{background:var(--mb-active);color:var(--mb-accent)}
.room-list{display:flex;flex-direction:column;gap:4px}.room-list button{display:flex;align-items:center;gap:9px;background:transparent;border:0;text-align:left;border-radius:11px;padding:9px 10px;color:var(--mb-muted);font:12px system-ui;cursor:pointer}.room-list button[aria-pressed=true]{background:var(--mb-active);color:var(--mb-accent);font-weight:650}.room-list button:before{content:'';border:1px solid currentColor;width:9px;height:9px;border-radius:3px}
.legend-state{display:flex;gap:9px;align-items:center;margin:9px 0;color:var(--mb-muted)}.legend-dot{height:9px;width:9px;border-radius:50%;background:#d6ac55}.legend-dot.heat{background:#bf8053}.legend-dot.robot{background:#76a9a4}.legend-dot.window{background:#88b8cb}
.legend-help{margin-top:auto;border-top:1px solid var(--mb-line);padding-top:16px;font-size:11px;color:var(--mb-muted);line-height:1.7}.legend-tools{display:flex;gap:6px}.legend-tools button{flex:1;border:1px solid var(--mb-line);background:var(--mock-surface);color:var(--mb-ink);border-radius:10px;min-height:36px;cursor:pointer}
@media(max-width:850px){.spatial-workspace{grid-template-columns:minmax(0,1fr) 190px;gap:10px}.spatial-legend{padding:17px 12px;gap:14px}:host([data-view=rooms]) main{padding:14px 12px 118px}.spatial-title>span{display:none}}
@media(max-width:540px){.spatial-workspace{grid-template-columns:minmax(0,1fr) 132px}.spatial-legend{border-radius:16px;padding:14px 8px;gap:13px}.spatial-legend h2{font-size:13px}.room-list button{padding:8px 4px;font-size:10px}.legend-help{font-size:9px}.spatial-title h1{font-size:19px}.spatial-title p{font-size:10px}.spatial-switch button{font-size:10px;padding:9px 3px}.legend-state{font-size:10px}.legend-label{font-size:9px}}
`;
function mapFrame(){
 const url=new URL('/dev/spatial-poc',location.origin);url.searchParams.set('presentation','map');url.searchParams.set('room',room);
 if(params.get('profile')==='local')url.searchParams.set('profile','local');
 frame=document.createElement('iframe');frame.title='Interaktive Wohnungskarte';frame.src=url;
 frame.onload=async()=>{const lab=()=>frame.contentWindow.spatialPoc;for(let i=0;i<100&&!lab();i++)await new Promise(r=>setTimeout(r,50));if(!lab())return;await lab().ready;lab().setProjection(projection);lab().simulator.update({theme});};return frame;
}
const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;};
function workspace(){
 const content=make('section','spatial-workspace'),stage=make('div','spatial-stage'),title=make('div','spatial-title');
 const heading=make('div');heading.append(make('h1','', 'Dein Zuhause'),make('p','','Eine Karte für Licht, Wärme und den Alltag.'));title.append(heading,make('span','','RÄUME / SPATIAL'));
 const map=make('div','mock-map');map.append(mapFrame());stage.append(title,map);
 const legend=make('section','spatial-legend');legend.setAttribute('aria-label','Kartenlegende');legend.append(make('h2','','Kartenansicht'));
 const group=(label)=>{const el=make('div');el.append(make('span','legend-label',label));legend.append(el);return el;};
 const modes=make('div','spatial-switch');
 for(const [id,label]of [['2d','2D · Plan'],['3d','3D · Raum']]){const b=make('button','',label);b.dataset.projection=id;b.setAttribute('aria-pressed',String(projection===id));b.onclick=()=>{projection=id;frame.contentWindow.spatialPoc?.setProjection(id);for(const node of modes.children)node.setAttribute('aria-pressed',String(node===b));};modes.append(b);}group('Perspektive').append(modes);
 const list=make('div','room-list');for(const r of rooms){const b=make('button','',r.label);b.dataset.room=r.id;b.setAttribute('aria-pressed',String(r.id===room));b.onclick=()=>{room=r.id;const old=frame;old.replaceWith(mapFrame());for(const node of list.children)node.setAttribute('aria-pressed',String(node===b));};list.append(b);}group('Räume').append(list);
 const states=group('Legende');for(const [type,text]of [['light','Licht eingeschaltet'],['heat','Heizung aktiv'],['robot','Saugfried unterwegs'],['window','Fenster offen']]){const row=make('div','legend-state');row.append(make('span',`legend-dot ${type}`),make('span','',text));states.append(row);}
 const tools=make('div','legend-tools');for(const [label,factor]of [['−',.8],['+',1.25],['↺',0]]){const b=make('button','',label);b.setAttribute('aria-label',factor===0?'Karte zurücksetzen':factor<1?'Verkleinern':'Vergrößern');b.onclick=()=>{const p=frame.contentWindow.spatialPoc?.panels[2];if(p)p.setCamera(factor?{...p.camera,zoom:Math.max(.65,Math.min(4,p.camera.zoom*factor))}:{...p.camera,x:300,y:210,zoom:1});};tools.append(b);}group('Kartenausschnitt').append(tools);
 legend.append(make('div','legend-help','Tippen schaltet Licht und Heizung. Halten öffnet die Regler.\n\nZwei Finger zum Zoomen und Drehen. Am Rechner: rechte Maustaste halten und ziehen.'));
 content.append(stage,legend);return content;
}
async function render(path='home'){
 const view=dashboard.views.find(v=>v.path===path)??dashboard.views[0];shell.setConfig(view.cards[0]);shell.hass=simulatedHass;
 await new Promise(resolve=>requestAnimationFrame(resolve));
 const overrides=make('style');overrides.textContent=style;shell.shadowRoot.append(overrides);
 if(path==='rooms')shell.shadowRoot.querySelector('.content').replaceChildren(productionMap());
 // Keep the actual home cards. A compact map is added only to its Rooms card.
 if(path==='home'){
  const card=shell.shadowRoot.querySelector('.mode-room-summary mufflonbau-live'),target=card?.shadowRoot?.querySelector('ha-card');
  if(target){const innerStyle=make('style');innerStyle.textContent=style+'ha-card.dashboard-summary{height:auto!important;display:block!important;padding:14px!important}.mock-preview{height:250px}';card.shadowRoot.append(innerStyle);const preview=make('div','mock-map mock-preview');preview.append(mapFrame());const open=make('button','mock-preview-link','Karte öffnen ↗');open.onclick=()=>render('rooms');preview.append(open);target.append(preview);}
 }
 document.documentElement.dataset.mockView=path;
}
shell.addEventListener('click',event=>{
 const link=event.composedPath().find(n=>n.tagName==='A'&&n.getAttribute('href'));
 if(!link||event.ctrlKey||event.metaKey)return;
 event.preventDefault();event.stopImmediatePropagation();const path=new URL(link.href).pathname.split('/').filter(Boolean).pop();render(path);
},{capture:true});
window.dashboardMock={render,get frame(){return frame;},get map(){return mapCard;}};
await render(params.get('view')??'home');

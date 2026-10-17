import { element, svgElement, iconPath, navigateLink } from '../design/dom.js';
import { localized } from '../core/i18n.js';
import { appendDrawing } from '../core/floorplan.js';
import { isOffline, numericState } from '../core/state.js';

// Private geometry is supplied as configuration, never bundled into the app.
export function renderInteractiveFloorplan(host, card, text) {
  card.classList.add('interactive-plan');
  const config = host._config;
  const rooms = config.rooms ?? [];
  host._mapRoom ??= config.focus_room ?? '';
  const bounds = new Map(rooms.map((room, index) => {
    const p = room.position ?? { x: index * 280, y: 0, width: 260, height: 160 };
    const shapes = p.points ? [p.points] : p.parts ?? [[[p.x,p.y],[p.x+p.width,p.y],[p.x+p.width,p.y+p.height],[p.x,p.y+p.height]]];
    const points = shapes.flat();
    return [room.id, { shapes, x: Math.min(...points.map(p => p[0])), y: Math.min(...points.map(p => p[1])), right: Math.max(...points.map(p => p[0])), bottom: Math.max(...points.map(p => p[1])) }];
  }));
  const devices = [...(config.objects ?? []), ...rooms.flatMap(room => (room.objects ?? []).map(item => {
    const b = bounds.get(room.id);
    return { ...item, id: `${room.id}-${item.id ?? item.entity ?? item.icon}`, room: room.id, position: { x: b.x + (b.right-b.x)*item.position.x, y: b.y + (b.bottom-b.y)*item.position.y } };
  }))];
  const selectedRoom = rooms.find(room => room.id === host._mapRoom);
  const b = selectedRoom && bounds.get(selectedRoom.id);
  const points = [...bounds.values()].flatMap(b => [[b.x,b.y],[b.right,b.bottom]]);
  for (const device of devices) points.push([device.position.x-24,device.position.y-24],[device.position.x+24,device.position.y+24]);
  for (const wall of config.walls ?? []) points.push(...wall);
  if (config.bounds) { const [x,y,w,h] = config.bounds; points.push([x,y],[x+w,y+h]); }
  const minX = Math.min(0,...points.map(p => p[0])); const minY = Math.min(0,...points.map(p => p[1]));
  const view = b ? [b.x-32,b.y-32,b.right-b.x+64,b.bottom-b.y+64] : [minX-8,minY-8,Math.max(1,...points.map(p => p[0]))-minX+16,Math.max(1,...points.map(p => p[1]))-minY+16];
  if (b) for (const d of devices.filter(d => d.room === selectedRoom.id)) {
    const right = Math.max(view[0]+view[2],d.position.x+28); const bottom = Math.max(view[1]+view[3],d.position.y+28);
    view[0] = Math.min(view[0],d.position.x-28); view[1] = Math.min(view[1],d.position.y-28);
    view[2] = right-view[0]; view[3] = bottom-view[1];
  }
  const toolbar = element('div', undefined, 'map-toolbar');
  const select = element('select'); select.setAttribute('aria-label', text.rooms);
  const all = element('option', text.allRooms); all.value = ''; select.append(all);
  for (const room of rooms) { const option = element('option', localized(room.name, host._language)); option.value = room.id; select.append(option); }
  select.value = selectedRoom?.id ?? '';
  select.addEventListener('change', () => { host._mapRoom = select.value; host._mapZoom = 1; host._mapDevice = undefined; host._render(); host.shadowRoot.querySelector('.map-toolbar select')?.focus(); });
  toolbar.append(select);
  for (const [label, title, change] of [['−',text.zoomOut,-.5],['+',text.zoomIn,.5],['↺',text.resetMap,0]]) {
    const button = element('button', label); button.setAttribute('aria-label',title);
    button.addEventListener('click', () => { host._mapZoom = change ? Math.max(1,Math.min(4,(host._mapZoom ?? 1)+change)) : 1; host._render(); host.shadowRoot.querySelector(`.map-toolbar button[aria-label="${title}"]`)?.focus(); }); toolbar.append(button);
  }
  card.append(toolbar);
  const viewport = element('div',undefined,'map-viewport');
  const svg = svgElement('svg',{ viewBox:view.join(' '), role:'group', class:'floor-map furnished-map', 'aria-label':text.floorplan });
  svg.style.setProperty('--mb-map-ratio',view[2]/view[3]);
  if ((host._mapZoom ?? 1)>1) { svg.style.width=`${host._mapZoom*100}%`; svg.style.maxHeight='none'; }
  for (const room of rooms) {
    const link = svgElement('a',{'data-room':room.id,'aria-label':localized(room.name,host._language)});
    navigateLink(link,`room-${room.id}`);
    const lit = (room.lights ?? []).some(id => host._hass.states[id]?.state === 'on');
    const offline = [room.temperature,room.humidity].filter(Boolean).some(id => isOffline(host._hass.states[id]));
    for (const polygon of bounds.get(room.id).shapes) link.append(svgElement('polygon',{points:polygon.map(p => p.join(',')).join(' '),class:`${lit?'lit':''} ${offline?'offline':''}`}));
    svg.append(link);
  }
  for (const wall of config.walls ?? []) svg.append(svgElement('polyline',{points:wall.map(p => p.join(',')).join(' '),class:'floor-wall'}));
  const drawing = svgElement('g',{class:'map-drawing','pointer-events':'none','aria-hidden':'true'});
  appendDrawing(drawing,config.drawing,svgElement); svg.append(drawing);
  for (const room of rooms) {
    const b = bounds.get(room.id); const pos = room.label_position ?? {x:.5,y:.5};
    const x = b.x+(b.right-b.x)*pos.x; const y = b.y+(b.bottom-b.y)*pos.y;
    const link = svgElement('a',{'data-room':room.id,'aria-label':localized(room.name,host._language)}); navigateLink(link,`room-${room.id}`);
    const label = svgElement('g',{class:'map-room-label'});
    const labelWidth = Math.min(164,b.right-b.x-10);
    label.append(svgElement('rect',{x:x-labelWidth/2,y:y-19,width:labelWidth,height:44,rx:8}));
    label.append(svgElement('text',{x,y:y-2,'text-anchor':'middle',class:'room-name'},localized(room.name,host._language)));
    const reading = (id,unit) => id && numericState(host._hass.states[id]) !== null ? host._value(id,unit) : `— ${unit}`;
    label.append(svgElement('text',{x,y:y+16,'text-anchor':'middle',class:'room-value'},`${reading(room.temperature,'°C')} · ${reading(room.humidity,'%')}`));
    label.append(svgElement('title',{},[room.temperature,room.humidity].filter(Boolean).map(id => `${host._name(id)}: ${host._state(id,text)}`).join(' · ') || text.noReadings));
    link.append(label); svg.append(link);
  }
  const status = device => {
    if (!device.entity) return text.notConfigured;
    const state = host._hass.states[device.entity];
    if (isOffline(state)) return host._state(device.entity,text);
    if (device.kind === 'window') return state.state === 'on' ? text.windowOpen : state.state === 'off' ? text.windowClosed : text.unknown;
    return device.kind === 'temperature' && numericState(state) !== null ? host._value(device.entity,'°C') : host._state(device.entity,text);
  };
  const choose = device => { host._mapDevice = device.id; host._render(); host.shadowRoot.querySelector('.map-device-detail button')?.focus(); };
  for (const device of devices.filter(d => !selectedRoom || d.room === selectedRoom.id)) {
    const {x,y} = device.position; const state = device.entity && host._hass.states[device.entity];
    const label = `${localized(device.name,host._language)} · ${status(device)}`;
    const marker = svgElement('a',{href:'#',role:'button',tabindex:0,'data-marker':device.id,'aria-label':label});
    marker.append(svgElement('circle',{cx:x,cy:y,r:14,class:`map-marker${state?.state==='on'?' active':''}${!device.entity || isOffline(state)?' unavailable':''}`}));
    marker.append(svgElement('path',{d:iconPath(device.icon),transform:`translate(${x-8} ${y-8}) scale(.67)`,class:'map-marker-icon'}));
    marker.append(svgElement('title',{},label));
    marker.addEventListener('click',event => {event.preventDefault(); event.stopPropagation(); choose(device);});
    marker.addEventListener('keydown',event => {if(event.key===' ') {event.preventDefault(); choose(device);}});
    svg.append(marker);
  }
  viewport.append(svg); card.append(viewport);
  const chosen = devices.find(d => d.id === host._mapDevice);
  if (chosen) {
    const panel = element('div',undefined,'map-device-detail'); panel.setAttribute('role','status');
    panel.append(element('strong',localized(chosen.name,host._language)),element('small',status(chosen)));
    if (chosen.entity) {
      const available = !isOffline(host._hass.states[chosen.entity]);
      const action = element('button',chosen.action === 'toggle' ? (host._hass.states[chosen.entity]?.state === 'on' ? text.turnOff : text.turnOn) : text.allDetails);
      action.disabled = chosen.action === 'toggle' && !available;
      action.addEventListener('click',async () => {
        if (chosen.action !== 'toggle') {host._moreInfo(chosen.entity); return;}
        action.disabled=true;
        try {await host._hass.callService('homeassistant','toggle',{}, {entity_id:chosen.entity});}
        catch {panel.append(element('small',text.actionFailed));}
        finally {action.disabled=!available;}
      }); panel.append(action);
    }
    const close = element('button',text.close); close.addEventListener('click',() => {host._mapDevice=undefined; host._render(); [...host.shadowRoot.querySelectorAll('[data-marker]')].find(node=>node.dataset.marker===chosen.id)?.focus();}); panel.append(close); card.append(panel);
  }
  const list = element('details',undefined,'map-device-list');
  if (host._mapListOpen) list.open=true;
  list.addEventListener('toggle',() => {host._mapListOpen=list.open;});
  list.append(element('summary',text.mapDevices));
  for (const device of devices.filter(d => !selectedRoom || d.room === selectedRoom.id)) {
    const button = element('button'); button.append(element('span',localized(device.name,host._language)),element('small',status(device)));
    button.addEventListener('click',() => choose(device)); list.append(button);
  }
  card.append(list);
}

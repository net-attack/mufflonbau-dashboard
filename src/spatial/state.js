// Live HA adapter. Missing, unknown, unavailable and legitimate zeroes stay distinct.
export const available = s => Boolean(s && !['unknown','unavailable'].includes(s.state));
export const number = s => available(s) && s.state !== '' && Number.isFinite(Number(s.state)) ? Number(s.state) : null;
export const clamp = (v,min,max,step=1) => Math.max(min,Math.min(max,Math.round(Number(v)/step)*step));
export function deviceState(device, states) {
  const raw=states[device.entity],a=raw?.attributes??{},modes=a.supported_color_modes??[];
  const type=device.type??device.entity?.split('.')[0];
  const active=available(raw) && (type==='light'||type==='outlet'||type==='switch'||type==='window'||device.entity?.startsWith('switch.')?raw.state==='on':type==='radiator'||type==='climate'?raw.state!=='off':['cleaning','returning'].includes(raw.state));
  const rgb=a.rgb_color;
  const temperature=a.color_temp_kelvin??2700,t=Math.max(0,Math.min(1,(temperature-2200)/4300));
  const color=rgb?.length===3?'#'+rgb.map(v=>clamp(v,0,255).toString(16).padStart(2,'0')).join(''):'#'+[255,185+50*t,99+156*t].map(n=>Math.round(n).toString(16).padStart(2,'0')).join('');
  return {raw,type,available:available(raw),status:!device.entity?'unconfigured':!raw?'missing':raw.state,active,color,
    brightness:typeof a.brightness==='number'?a.brightness/255:active?1:0,
    dimmable:modes.some(m=>!['onoff','unknown'].includes(m)),colorable:modes.some(m=>['rgb','rgbw','rgbww','xy','hs'].includes(m)),temperatureColor:modes.includes('color_temp'),
    minKelvin:a.min_color_temp_kelvin??2200,maxKelvin:a.max_color_temp_kelvin??6500,kelvin:temperature,
    target:a.temperature,min:a.min_temp??5,max:a.max_temp??30,step:a.target_temp_step??.5,
    heating:active && a.hvac_action==='heating',open:available(raw)&&raw.state==='on',
    power:number(states[device.power]),energy:number(states[device.energy]),energyToday:number(states[device.energy_today]),
  };
}
export function command(device,states,intent) {
  const s=deviceState(device,states);if(!s.available)return null;
  const domain=device.entity.split('.')[0],target={entity_id:device.entity};
  const result=(service,data={},confirm=false)=>({domain,service,data,target,confirm});
  if(intent.type==='toggle') {
    if(domain==='light')return result(s.active?'turn_off':'turn_on');
    // Every switch action requires fresh user confirmation; use explicit state
    // actions, never toggle, so a concurrent state update cannot reverse intent.
    if(domain==='switch')return result(s.active?'turn_off':'turn_on',{},true);
    if(domain==='climate') {const modes=s.raw.attributes.hvac_modes??[],mode=s.active?'off':modes.find(m=>['heat','auto','heat_cool'].includes(m));return modes.includes(mode)?result('set_hvac_mode',{hvac_mode:mode}):null;}
  }
  if(domain==='light'&&intent.type==='brightness'&&s.dimmable)return result('turn_on',{brightness_pct:clamp(intent.value,0,100)});
  if(domain==='light'&&intent.type==='kelvin'&&s.temperatureColor)return result('turn_on',{color_temp_kelvin:clamp(intent.value,s.minKelvin,s.maxKelvin)});
  if(domain==='light'&&intent.type==='color'&&s.colorable&&/^#[a-f\d]{6}$/i.test(intent.value))return result('turn_on',{rgb_color:intent.value.slice(1).match(/../g).map(v=>parseInt(v,16))});
  if(domain==='climate'&&intent.type==='temperature'&&Number.isFinite(Number(intent.value)))return result('set_temperature',{temperature:clamp(intent.value,s.min,s.max,s.step)});
  if(domain==='vacuum'&&['start','pause','stop','return_to_base'].includes(intent.type)) {
    const feature={start:8192,pause:4,stop:8,return_to_base:16}[intent.type];
    return (s.raw.attributes.supported_features&feature)?result(intent.type):null;
  }
  if(domain==='vacuum'&&intent.type==='fan_speed'&&(s.raw.attributes.fan_speed_list??[]).includes(intent.value))return result('set_fan_speed',{fan_speed:intent.value});
  return null;
}
export async function perform(hass,device,intent,confirmSwitch) {
  const next=command(device,hass.states,intent);if(!next)return false;
  if(next.confirm && !await confirmSwitch(next.service==='turn_on'))return false;
  // Recheck availability after the confirmation, without changing the approved
  // on/off intent. The exact explicit action above remains authoritative.
  if(!deviceState(device,hass.states).available)return false;
  await hass.callService(next.domain,next.service,next.data,next.target);return true;
}
export function validateSpatial(config) {
  if(config===undefined)return;
  if(!config||!Array.isArray(config.scenes)||!config.scenes.length||config.scenes.length>30)throw new Error('Mufflonbau: floorplan_spatial.scenes must contain 1–30 scenes.');
  const ids=new Set();let budget=120000;
  const walk=(v,depth=0)=>{if(--budget<0||depth>18)throw new Error('Mufflonbau: spatial scene exceeds geometry budget.');if(typeof v==='number'&&!Number.isFinite(v))throw new Error('Mufflonbau: spatial coordinates must be finite.');if(Array.isArray(v))v.forEach(x=>walk(x,depth+1));else if(v&&typeof v==='object')Object.values(v).forEach(x=>walk(x,depth+1));};
  for(const scene of config.scenes){
    if(!/^[a-z0-9][a-z0-9_-]*$/i.test(scene.id??'')||ids.has(scene.id)||!scene.room?.points?.length||!Array.isArray(scene.objects))throw new Error('Mufflonbau: spatial scenes need unique IDs, room points and objects.');ids.add(scene.id);
    if(scene.room.points.some(p=>p.length!==2||p.some(n=>typeof n!=='number'||!Number.isFinite(n))))throw new Error('Mufflonbau: invalid spatial room polygon.');
    const entityIds=new Set();for(const d of scene.devices??[]){if(!/^[a-z0-9][a-z0-9_-]*$/i.test(d.id??'')||entityIds.has(d.id)||typeof d.x!=='number'||typeof d.y!=='number')throw new Error('Mufflonbau: spatial devices require unique IDs and coordinates.');entityIds.add(d.id);for(const key of ['entity','power','energy','energy_today'])if(d[key]&&!/^[a-z_]+\.[a-z0-9_]+$/.test(d[key]))throw new Error('Mufflonbau: invalid spatial entity ID.');}
    walk(scene);
  }
}

// Shared fallback for older map/device controls. Every explicit switch command
// follows the same confirmation policy as the new spatial map.
export function switchAction(hass,id,name,language='de') {
 return perform(hass,{id,entity:id,type:'outlet'}, {type:'toggle'},on=>window.confirm(language==='en'?`${name}: Are you sure you want to turn the power ${on?'on':'off'}?`:`${name}: Strom sicher ${on?'einschalten':'abschalten'}?`));
}

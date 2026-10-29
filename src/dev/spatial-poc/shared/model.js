// Synthetic, deliberately small geometry. No personal HA entities or floorplan.
export const scene = {
  width: 600, height: 420,
  room: { x: 44, y: 48, width: 512, height: 318 },
  objects: { sofa: { x: 96, y: 120, width: 132, height: 130 }, table: { x: 268, y: 183, width: 70, height: 62 } },
  entities: [
    { id: 'light', name: 'Leselicht', type: 'light', x: 410, y: 139, z: 54, radius: 25 },
    { id: 'heating', name: 'Heizung', type: 'radiator', x: 472, y: 82, z: 32, radius: 29 },
    { id: 'window', name: 'Fenster', type: 'window', x: 300, y: 48, z: 40, radius: 30 },
    { id: 'dehumidifier', name: 'Entfeuchter', type: 'dehumidifier', x: 489, y: 279, z: 40, radius: 29 },
    { id: 'vacuum', name: 'Saugfried', type: 'vacuum', x: 104, y: 322, z: 8, radius: 25 },
    { id: 'temperature', name: 'Temperatur', type: 'sensor', x: 275, y: 105, z: 16, radius: 24 },
    { id: 'humidity', name: 'Luftfeuchte', type: 'sensor', x: 342, y: 105, z: 16, radius: 24 },
  ],
};
export const initialState = {
  theme: 'storybook', light: { active: true, brightness: .7, colorTemperature: 2700, supportsColor: true, colorMode: 'temperature', color: '#ffbd6a' },
  heating: { active: true, level: .6, targetTemperature: 21 }, dehumidifier: { state: 'running' },
  vacuum: { state: 'cleaning', battery: 78, suction: 'standard', mode: 'vacuum', showTrail: true }, window: { state: 'open' },
  temperature: { value: 22.1 }, humidity: { value: 64 }, frozen: false,
};
export const vacuumStates = ['docked', 'idle', 'cleaning', 'paused', 'returning', 'error'];
export const isLightEntity = id => scene.entities.some(e => e.id === id && e.type === 'light');
export const lightState = (state, id = 'light') => state[id] ?? state.light;
export function createSimulator(seed = initialState) {
  let state = structuredClone(seed), version = 0;
  for(const [key,value] of Object.entries(scene.profile?.initialState ?? {})) state[key] = { ...state[key], ...value };
  for (const entity of scene.entities.filter(e => e.type === 'light' && e.id !== 'light')) state[entity.id] = { ...structuredClone(seed.light), ...entity.initialState };
  const listeners = new Set();
  return {
    get state() { return state; }, get version() { return version; },
    subscribe(listener) { listeners.add(listener); listener(state, version); return () => listeners.delete(listener); },
    update(patch) {
      state = { ...state, ...Object.fromEntries(Object.entries(patch).map(([key, value]) =>
        [key, value && typeof value === 'object' ? { ...state[key], ...value } : value])) };
      version++; for (const listener of listeners) listener(state, version);
    },
    dispatch(intent) {
      const key = intent.entity ?? 'light', lamp = lightState(state,key);
      if (intent.entity && !isLightEntity(intent.entity) && ['toggle-light','brightness','light-color','color-temperature'].includes(intent.type)) return;
      if (intent.type === 'toggle-light') this.update({ [key]: { active: !lamp.active } });
      if (intent.type === 'brightness') this.update({ [key]: { brightness: Math.max(0, Math.min(1, Number(intent.value))) } });
      if (intent.type === 'toggle-heating') this.update({ heating: { active: !state.heating.active } });
      if (intent.type === 'target-temperature') this.update({ heating: { targetTemperature: Math.max(5, Math.min(30, Math.round(Number(intent.value) * 2) / 2)) } });
      if (intent.type === 'light-color' && lamp.supportsColor && /^#[\da-f]{6}$/i.test(intent.value)) this.update({ [key]: { color: intent.value, colorMode: 'rgb' } });
      if (intent.type === 'color-temperature') this.update({ [key]: { colorTemperature: Math.max(2200, Math.min(6500, Number(intent.value))), colorMode: 'temperature' } });
      if (intent.type === 'vacuum-state' && vacuumStates.includes(intent.value)) this.update({ vacuum: { state: intent.value } });
    },
    preset(name) {
      for (const entity of scene.entities.filter(e => e.type === 'light' && e.id !== 'light')) this.update({ [entity.id]: { active: name !== 'idle', brightness: .7 } });
      if (name === 'idle') this.update({ light: { active: false }, heating: { active: false }, dehumidifier: { state: 'off' }, vacuum: { state: 'docked' }, window: { state: 'closed' }, frozen: false });
      else this.update({ ...structuredClone(initialState), theme: state.theme });
    },
  };
}
export function isAnimating(s) {
  return !s.frozen && (s.heating.active || s.dehumidifier.state === 'running' || s.window.state === 'open' || ['cleaning', 'returning', 'error'].includes(s.vacuum.state));
}
export function vacuumPosition(state, time = 0) {
  const route=scene.route??{cx:300,cy:284,rx:112,ry:38,dock:{x:104,y:322}};
  if (state.vacuum.state === 'docked' || state.vacuum.state === 'idle') return route.dock;
  if (state.vacuum.state === 'returning') {
    const p = (time % 8) / 8; return { x: (route.cx+route.rx)*(1-p)+route.dock.x*p, y: route.cy*(1-p)+route.dock.y*p };
  }
  const t = state.vacuum.state === 'cleaning' ? time : 3;
  return { x: route.cx + route.rx * Math.cos(t * .32), y: route.cy + route.ry * Math.sin(t * .32) };
}
export function entityPosition(id, state, time) {
  return id === 'vacuum' ? { ...vacuumPosition(state, time), z: 8 } : scene.entities.find(e => e.id === id);
}
export function vacuumTrail(state, time) {
  if (!state.vacuum.showTrail || ['idle', 'docked'].includes(state.vacuum.state)) return [];
  const end = state.vacuum.state === 'cleaning' ? Math.max(0, time) : state.vacuum.state === 'returning' ? time % 8 : 3;
  const start = Math.max(0, end - 20), steps = Math.ceil((end - start) / .15);
  const routeState = { ...state, vacuum: { ...state.vacuum, state: state.vacuum.state === 'returning' ? 'returning' : 'cleaning' } };
  return Array.from({ length: steps + 1 }, (_, i) => vacuumPosition(routeState, start + (end - start) * i / Math.max(1, steps)));
}
export function lightColor(state, id = 'light') {
  state = { light: lightState(state,id) };
  if (state.light.supportsColor && state.light.colorMode === 'rgb') return state.light.color;
  const amount = Math.max(0, Math.min(1, (state.light.colorTemperature - 2200) / 4300));
  return `#${[255, 185 + 50 * amount, 99 + 156 * amount].map(n => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
}
export function heldFaderValue(id, initial, deltaY) {
  if (id === 'light') return Math.max(0, Math.min(1, Math.round((initial - deltaY / 170) * 100) / 100));
  return Math.max(5, Math.min(30, Math.round((initial - deltaY / 12) * 2) / 2));
}

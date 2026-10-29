import { scene, entityPosition, isAnimating, vacuumStates, isLightEntity, lightState } from './shared/model.js';
import { matrix, project, placeOverlay, defaultAngle } from './shared/camera.js';
import { applyTheme } from './shared/themes.js';
import { attachInteractions } from './shared/interactions.js';
import { SvgRenderer } from './svg/renderer.js';
import { mountDeviceControls, refreshDeviceControls } from './shared/device-controls.js';

const architectures = [
  { id: 'svg', number: '01', name: 'Modern SVG', label: 'Vektor & DOM', detail: 'SVG-Geometrie · SVG-Licht · native Bedienung' },
  { id: 'hybrid', number: '02', name: 'SVG + Pixi', label: 'Struktur + Effekte', detail: 'SVG-Geometrie · GPU-Licht & Partikel' },
  { id: 'pixi', number: '03', name: 'Pixi Spatial', label: 'GPU-Szenengraph', detail: 'Pixi-Geometrie · GPU-Licht · DOM-Details' },
];
const description = (id, s) => { if(isLightEntity(id)) { const l=lightState(s,id);return `${l.active?'An':'Aus'} · ${Math.round(l.brightness*100)} % · ${l.colorTemperature} K`; } return ({ light: `${s.light.active ? 'An' : 'Aus'} · ${Math.round(s.light.brightness * 100)} % · ${s.light.colorTemperature} K`,
  heating: `${s.heating.active ? 'An' : 'Aus'} · Soll ${s.heating.targetTemperature.toFixed(1)} °C · Raum ${s.temperature.value.toFixed(1)} °C`, window: s.window.state === 'open' ? 'Offen' : 'Geschlossen',
  dehumidifier: s.dehumidifier.state === 'running' ? 'Läuft' : 'Aus', vacuum: `${s.vacuum.state} · ${s.vacuum.battery} % Akku · ${s.vacuum.suction}`, temperature: `${s.temperature.value.toFixed(1)} °C`, humidity: `${s.humidity.value} %` })[id]; };

class ScenePanel {
  constructor(root, architecture, simulator, lab) {
    Object.assign(this, { architecture, simulator, lab, camera: { x: 300, y: 210, zoom: 1, mode: '2d', angle: 0 }, visible: true, frames: 0, totalCalls: 0, duration: 0 });
    this.element = document.createElement('article'); this.element.className = 'scene-card'; this.element.dataset.renderer = architecture.id;
    this.element.innerHTML = `<header class="scene-heading"><span class="number">${architecture.number}</span><div><h2>${architecture.name}</h2><p>${architecture.detail}</p></div><span class="renderer-tag">${architecture.label}</span></header>
      <div class="viewport" aria-label="${architecture.name} interaktiver Grundriss"></div>
      <div class="scene-tools"><button type="button" data-zoom="out" aria-label="${architecture.name} verkleinern">−</button><button type="button" data-zoom="in" aria-label="${architecture.name} vergrößern">+</button><button type="button" data-rotate="-1" aria-label="${architecture.name} links drehen">↶</button><button type="button" data-rotate="1" aria-label="${architecture.name} rechts drehen">↷</button><button type="button" data-zoom="reset">Zurücksetzen</button><span class="zoom-readout">100 %</span></div>
      <div class="scene-readings"></div><details class="accessible-devices"><summary>Geräte per Tastatur bedienen</summary><div></div></details><div class="stats" hidden></div>`;
    root.append(this.element); this.viewport = this.element.querySelector('.viewport');
    this.readings = this.element.querySelector('.scene-readings'); this.statistics = this.element.querySelector('.stats');
    for (const button of this.element.querySelectorAll('[data-zoom]')) button.onclick = () => {
      const action = button.dataset.zoom;
      this.setCamera(action === 'reset' ? { ...this.camera, x: 300, y: 210, zoom: 1, angle: this.camera.mode === '2d' ? 0 : defaultAngle } : { ...this.camera, zoom: Math.max(.65, Math.min(4, this.camera.zoom * (action === 'in' ? 1.3 : 1 / 1.3))) });
    };
    for (const button of this.element.querySelectorAll('[data-rotate]')) button.onclick = () => this.setCamera({ ...this.camera, angle: (this.camera.angle ?? defaultAngle) + Number(button.dataset.rotate) * Math.PI / 12 });
    const accessible = this.element.querySelector('.accessible-devices div');
    for (const entity of scene.entities) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.device = entity.id; button.textContent = `${entity.name} · Details`;
      button.onclick = () => this.openPopup(entity.id); accessible.append(button);
    }
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = 'Leselicht umschalten'; toggle.dataset.action = 'toggle-light';
    toggle.onclick = () => simulator.dispatch({ type: 'toggle-light' }); accessible.prepend(toggle);
  }
  async init() {
    if (this.architecture.id === 'svg') this.renderer = new SvgRenderer(this.viewport);
    else { const { createPixiRenderer } = await import('./pixi/renderer.js'); this.renderer = await createPixiRenderer(this.viewport, this.architecture.id === 'hybrid'); }
    this.renderer.invalidate = () => this.draw();
    this.unbind = attachInteractions(this.viewport, this);
    this.observer = new ResizeObserver(() => { this.resize(); this.draw(); }); this.observer.observe(this.viewport);
    this.onScroll=()=>this.positionPopup();window.addEventListener('scroll',this.onScroll,{passive:true,capture:true});
    this.visibility = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; if (this.visible && !this.element.hidden) this.draw(); this.lab.reconcile(); }); this.visibility.observe(this.element);
    this.update(this.simulator.state, this.simulator.version); this.element.dataset.ready = 'true';
  }
  update(state, version) {
    this.state = state; if (!this.renderer) return;
    const updateStart = performance.now();
    const focused = this.viewport.contains(document.activeElement) && document.activeElement.dataset.entity;
    this.renderer.update(state); Object.assign(this.element.dataset, { version: String(version), theme: state.theme, light: String(state.light.active), brightness: String(state.light.brightness) });
    this.readings.textContent = `${state.temperature.value.toFixed(1)} °C  /  ${state.humidity.value} %  /  ${state.vacuum.state}  /  ${state.window.state === 'open' ? 'Fenster offen' : 'Fenster zu'}`;
    this.resize(); this.draw(); if (focused) this.viewport.querySelector(`[data-entity="${focused}"]`)?.focus(); this.refreshPopup();
    this.lastStateUpdateMs = performance.now() - updateStart;
  }
  resize() {
    if (!this.renderer) return;
    const { width, height } = this.viewport.getBoundingClientRect(); if (!width || !height) return;
    this.transform = matrix(width, height, this.camera); this.renderer.camera(this.transform, width, height);
    this.element.querySelector('.zoom-readout').textContent = `${Math.round(this.camera.zoom * 100)} % · ${Math.round((this.camera.angle ?? defaultAngle) * 180 / Math.PI) % 360}°`; this.positionPopup();
  }
  point(id) { return project(entityPosition(id, this.state, this.lab.time), this.transform); }
  setCamera(camera) { this.lab.cameraChanged(this, camera); }
  draw() {
    if (!this.renderer || this.element.hidden || document.hidden) return;
    const start = performance.now(); this.renderer.frame(this.lab.time); this.duration += performance.now() - start; this.frames++; this.totalCalls++; this.positionPopup();
  }
  openPopup(id, focus = true) {
    for (const panel of this.lab.panels) panel.closePopup(false);
    this.selected = id;
    this.popup = document.createElement('div'); this.popup.className = 'device-popup'; this.popup.style.width = '236px'; this.popup.setAttribute('role', 'dialog'); this.popup.setAttribute('aria-label', `${scene.entities.find(e => e.id === id).name} Details`);
    if (isLightEntity(id) || ['heating', 'vacuum'].includes(id)) {
      this.popup.classList.add('device-controls');this.popup.dataset.device=isLightEntity(id)?'light':id;
    }
    this.popup.innerHTML = '<div class="popup-heading"><strong></strong><button type="button" aria-label="Details schließen">×</button></div><p class="popup-state"></p>';
    this.popup.querySelector('strong').textContent = scene.entities.find(e => e.id === id).name;
    this.popup.querySelector('button').onclick = () => this.closePopup();
    mountDeviceControls(this, id, this.popup);
    const note = document.createElement('small'); note.className = 'offscreen-note'; note.textContent = 'Gerät außerhalb der Ansicht · zum Rand verankert'; note.hidden = true; this.popup.append(note);
    this.connector = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); this.connector.classList.add('popup-connector'); this.connector.append(document.createElementNS('http://www.w3.org/2000/svg', 'line'));
    this.viewport.append(this.connector, this.popup); this.refreshPopup(); if (focus) this.popup.querySelector('button').focus();
    this.lab.reconcile();
    this.popup.onkeydown = e => {
      if (e.key === 'Escape') { e.stopPropagation(); this.closePopup(); }
    };
  }
  refreshPopup() {
    if (!this.popup) return;
    this.popup.querySelector('.popup-state').textContent = description(this.selected, this.state);
    refreshDeviceControls(this); this.positionPopup();
  }
  positionPopup() {
    if (!this.popup || !this.transform) return;
    const rect = this.viewport.getBoundingClientRect(), anchor = project(entityPosition(this.selected, this.state, this.lab.time), this.transform);
    if(this.popup.classList.contains('device-controls')) {
      this.popup.classList.toggle('compact-controls',innerHeight<480);
      this.popup.style.width=`${Math.min(this.selected==='heating'?250:340,innerWidth-20)}px`;
      const screenAnchor={x:rect.left+anchor.x,y:rect.top+anchor.y};
      this.popup.querySelector('.offscreen-note').hidden=screenAnchor.x>=0 && screenAnchor.y>=0 && screenAnchor.x<=innerWidth && screenAnchor.y<=innerHeight;
      const position=placeOverlay(screenAnchor,{width:innerWidth,height:innerHeight},{width:this.popup.offsetWidth,height:this.popup.offsetHeight});
      Object.assign(this.popup.style,{left:`${position.x}px`,top:`${position.y}px`});
      for(const [key,value]of Object.entries({x1:anchor.x,y1:anchor.y,x2:position.x+position.width/2-rect.left,y2:position.y+this.popup.offsetHeight/2-rect.top}))this.connector.firstChild.setAttribute(key,value);
      return;
    }
    this.popup.querySelector('.offscreen-note').hidden = !(anchor.x < 0 || anchor.y < 0 || anchor.x > rect.width || anchor.y > rect.height);
    const position = placeOverlay(anchor, rect, { width: 236, height: this.popup.offsetHeight });
    Object.assign(this.popup.style, { left: `${position.x}px`, top: `${position.y}px`, width: `${position.width}px` }); this.popup.querySelector('.offscreen-note').hidden = !position.offscreen;
    for (const [key, value] of Object.entries({ x1: position.anchorX, y1: position.anchorY, x2: position.x + position.width / 2, y2: position.y + this.popup.offsetHeight / 2 })) this.connector.firstChild.setAttribute(key, value);
  }
  closePopup(focus = true) {
    const selected = this.selected, hadPopup=Boolean(this.popup); this.popup?.remove(); this.connector?.remove(); this.popup = null; this.selected = null;
    if(hadPopup) { for(const panel of this.lab.panels) if(panel.visible) panel.draw(); this.lab.reconcile(); }
    if (focus && selected) (this.viewport.querySelector(`[data-entity="${selected}"]`) ?? this.element.querySelector(`[data-device="${selected}"]`))?.focus();
  }
  sample(elapsed) {
    const metrics = { ...this.renderer?.metrics(), updatesPerSecond: this.frames / elapsed, meanUpdateMs: this.frames ? this.duration / this.frames : 0, lastStateUpdateMs: this.lastStateUpdateMs, totalCalls: this.totalCalls,
      sleeping: !isAnimating(this.state) || !this.visible || this.element.hidden || document.hidden, active: this.visible && !this.element.hidden };
    this.lastMetrics = metrics;
    this.statistics.textContent = `${metrics.backend} · ${Math.round(metrics.updatesPerSecond)} updates/s · ${metrics.meanUpdateMs.toFixed(2)} ms JS+submit · ${metrics.objects} nodes · ${metrics.resolution} · ${metrics.sleeping ? 'ON DEMAND' : 'ANIMIERT'}${metrics.systemTickerListeners !== undefined ? ` · ${metrics.systemTickerListeners} Pixi-GC-Listener gesamt` : ''}`;
    this.statistics.title = 'Updates/s zählen eigene Szenenupdates, keine gemessenen SVG-Paints. JS+submit ist keine GPU-Zeit. Pixis interne GC-Scheduler laufen auch ohne Redraw weiter; der globale Listener-Zähler gilt für beide GPU-Panels zusammen.';
    this.frames = this.duration = 0; return metrics;
  }
  destroy() { this.unbind?.(); this.observer?.disconnect(); this.visibility?.disconnect();window.removeEventListener('scroll',this.onScroll,true); this.renderer?.destroy(); }
}

export async function createLab(simulator) {
  const root = document.querySelector('#app');
  root.innerHTML = `<header class="lab-header"><div><div class="eyebrow"><span class="live-dot"></span> MUFFLONBAU / SPATIAL LAB <span class="dev-badge">DEV ONLY</span></div><h1>Ein Raum. Drei Perspektiven.</h1><p>Gleicher Alltag, andere Technik. Entdecke Licht, Bewegung und Raumgefühl.</p></div><div class="header-note">01 WOHNZIMMER<br><strong>Alles hier ist simuliert.</strong><br>Keine Verbindung zu Home Assistant.</div></header>
    <section class="control-deck" aria-label="Gemeinsame Simulation"><div class="deck-top"><div class="segmented" aria-label="Theme"><button data-theme="storybook">Storybook</button><button data-theme="blueprint">Blueprint</button></div><div class="segmented" aria-label="Ansicht"><button data-view="compare">Vergleichen</button><button data-view="svg">SVG</button><button data-view="hybrid">Hybrid</button><button data-view="pixi">Pixi</button></div><div class="segmented" aria-label="Projektion"><button data-projection="2d" aria-pressed="true">2D</button><button data-projection="3d" aria-pressed="false">3D</button></div><label class="room-picker" hidden>Raum <select aria-label="Raum auswählen"></select></label><div class="presets"><button data-preset="demo">Demo-Zustand</button><button data-preset="idle">Idle prüfen</button></div></div><div class="control-grid"></div><div class="deck-bottom"><label><input type="checkbox" id="freeze"> Animation einfrieren</label><label><input type="checkbox" id="linked" checked> Kameras verbinden</label><label><input type="checkbox" id="statistics"> Statistik</label><label><input type="checkbox" id="trail" checked> Fahrtweg</label><span>Tippen: Licht / Heizung schalten · Halten + hoch/runter: Regler · Saugfried: Einstellungen · 2 Finger: drehen / zoomen · Rechte Maustaste + Ziehen: drehen</span></div></section>
    <section class="comparison" aria-label="Renderer-Vergleich"></section><footer class="lab-footer"><span>ARCHITEKTURSTUDIE / KEINE PRODUKTIONSMIGRATION</span><span class="bundle-info">Bundlegrößen werden geladen …</span></footer>`;
  const controls = root.querySelector('.control-grid');
  if(scene.roomChoices?.length) {
    const label=root.querySelector('.room-picker'),select=label.querySelector('select');label.hidden=false;
    for(const room of scene.roomChoices) { const option=document.createElement('option');option.value=room.id;option.textContent=room.label;option.selected=room.id===scene.profile.id;select.append(option); }
    select.onchange=()=>{const url=new URL(location.href);url.searchParams.set('room',select.value);location.assign(url);};
  }
  if(scene.profile) {
    root.querySelector('h1').textContent=scene.profile.label;
    root.querySelector('.lab-header p').textContent='Euer privater Grundriss · 2D / drehbare 3D-Vorschau';
    root.querySelector('.header-note').textContent=scene.profile.note;
    root.querySelector('.dev-badge').textContent='PRIVATE VORSCHAU';
  }
  const control = (title, key, field, type, min, max, step, choices) => {
    const label = document.createElement('label'); label.className = 'control'; const text = document.createElement('span'); text.textContent = title; label.append(text);
    const input = document.createElement(type === 'select' ? 'select' : 'input'); if (type !== 'select') input.type = type;
    if (min !== undefined) { input.min = min; input.max = max; input.step = step; }
    for (const [value, name] of choices ?? []) { const option = document.createElement('option'); option.value = value; option.textContent = name; input.append(option); }
    input.dataset.control = `${key}.${field}`; input.setAttribute('aria-label', title); const output = document.createElement('output'); label.append(input, output); controls.append(label);
    input.oninput = () => {
      if (key === 'light' && field === 'colorTemperature') simulator.dispatch({ type: 'color-temperature', value: Number(input.value) });
      else simulator.update({ [key]: { [field]: type === 'checkbox' ? input.checked : ['range', 'number'].includes(type) ? Number(input.value) : input.value } });
    };
    return { input, output, key, field, type };
  };
  const bindings = [control('Leselicht', 'light', 'active', 'checkbox'), control('Helligkeit', 'light', 'brightness', 'range', 0, 1, .01),
    control('Lichtfarbe · Kelvin', 'light', 'colorTemperature', 'range', 2200, 6500, 100), control('Heizung', 'heating', 'active', 'checkbox'), control('Wärmeintensität', 'heating', 'level', 'range', 0, 1, .01),
    control('Entfeuchter', 'dehumidifier', 'state', 'select', undefined, undefined, undefined, [['off', 'Aus'], ['running', 'Läuft']]),
    control('Fenster', 'window', 'state', 'select', undefined, undefined, undefined, [['closed', 'Geschlossen'], ['open', 'Offen']]),
    control('Saugfried', 'vacuum', 'state', 'select', undefined, undefined, undefined, vacuumStates.map(s => [s, s])),
    control('Temperatur · °C', 'temperature', 'value', 'range', 10, 35, .1), control('Luftfeuchte · %', 'humidity', 'value', 'range', 20, 90, 1),
    control('Heizung · Soll °C', 'heating', 'targetTemperature', 'range', 5, 30, .5), control('Licht kann Farbe', 'light', 'supportsColor', 'checkbox')];
  const lab = { simulator, panels: [], time: 0, view: 'pixi', raf: 0, last: 0,
    cameraChanged(source, camera) {
      for (const panel of this.panels) if (panel === source || root.querySelector('#linked').checked) { panel.camera = { ...source.camera, ...camera }; panel.resize(); panel.draw(); }
    },
    reconcile() {
      cancelAnimationFrame(this.raf); this.raf = 0; this.last = 0;
      if (isAnimating(simulator.state) && !document.hidden && this.panels.some(p => p.renderer && p.visible && !p.element.hidden)) this.raf = requestAnimationFrame(this.tick);
    },
    setProjection(mode) {
      for(const panel of this.panels) { panel.camera={ ...panel.camera,mode,angle:mode==='2d'?0:defaultAngle };panel.resize();panel.draw(); }
      for(const button of root.querySelectorAll('[data-projection]'))button.setAttribute('aria-pressed',String(button.dataset.projection===mode));
    },
    setView(view) {
      this.view = view; root.dataset.view = view;
      for (const button of root.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === view));
      for (const panel of this.panels) { panel.element.hidden = view !== 'compare' && panel.architecture.id !== view; panel.closePopup(false); panel.resize(); panel.draw(); } this.reconcile();
    },
    capture(time = 3.5) { this.time = time; simulator.update({ frozen: true }); for (const panel of this.panels) panel.draw(); },
    metrics() { return this.panels.map(p => ({ renderer: p.architecture.id, ...p.renderer?.metrics(), ...p.lastMetrics, totalCalls: p.totalCalls })); },
  };
  lab.tick = now => { if (lab.last) lab.time += Math.min(.1, (now - lab.last) / 1000); lab.last = now;
    for (const panel of lab.panels) if (panel.visible && !panel.element.hidden) panel.draw(); lab.raf = requestAnimationFrame(lab.tick); };
  for (const a of architectures) lab.panels.push(new ScenePanel(root.querySelector('.comparison'), a, simulator, lab));
  for (const button of root.querySelectorAll('[data-theme]')) button.onclick = () => simulator.update({ theme: button.dataset.theme });
  for (const button of root.querySelectorAll('[data-projection]')) button.onclick=()=>lab.setProjection(button.dataset.projection);
  for (const button of root.querySelectorAll('[data-view]')) button.onclick = () => lab.setView(button.dataset.view);
  for (const button of root.querySelectorAll('[data-preset]')) button.onclick = () => { lab.time = 0; simulator.preset(button.dataset.preset); };
  root.querySelector('#trail').onchange = e => simulator.update({ vacuum: { showTrail:e.target.checked } });
  root.querySelector('#freeze').onchange = e => simulator.update({ frozen: e.target.checked });
  let sampleTimer, sampleStart; const statistics = root.querySelector('#statistics');
  statistics.onchange = () => { clearInterval(sampleTimer); sampleStart = performance.now();
    for (const panel of lab.panels) { panel.statistics.hidden = !statistics.checked; panel.frames = panel.duration = 0; }
    if (statistics.checked) sampleTimer = setInterval(() => { const now = performance.now(); for (const panel of lab.panels) panel.sample((now - sampleStart) / 1000); sampleStart = now; }, 1000);
  };
  const unsubscribe = simulator.subscribe((state, version) => {
    applyTheme(document.body, state.theme);
    for (const b of bindings) { if (b.type === 'checkbox') b.input.checked = state[b.key][b.field]; else b.input.value = state[b.key][b.field];
      b.output.textContent = b.type === 'checkbox' ? state[b.key][b.field] ? 'An' : 'Aus' : b.type === 'range' ? `${['brightness', 'level'].includes(b.field) ? Math.round(state[b.key][b.field] * 100) + ' %' : state[b.key][b.field]}` : ''; }
    root.querySelector('#freeze').checked = state.frozen;
    root.querySelector('#trail').checked = state.vacuum.showTrail;
    for (const button of root.querySelectorAll('[data-theme]')) button.setAttribute('aria-pressed', String(button.dataset.theme === state.theme));
    for (const panel of lab.panels) panel.update(state, version); lab.reconcile();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) for (const panel of lab.panels) if (panel.visible) panel.draw(); lab.reconcile(); });
  lab.ready = Promise.all(lab.panels.map(async panel => { try { await panel.init(); } catch (error) { panel.element.dataset.ready = 'error';
    const message = document.createElement('p'); message.className = 'renderer-error'; message.textContent = `Renderer nicht verfügbar: ${error.message}. SVG bleibt bedienbar. Kein stiller Ersatzrenderer.`; panel.viewport.append(message); }
  })).then(() => { lab.setView('pixi'); lab.reconcile(); });
  fetch('/dev/spatial-poc/bundle-sizes.json').then(r => r.json()).then(sizes => {
    root.querySelector('.bundle-info').textContent = `Dev JS gesamt: ${(sizes.reduce((sum, s) => sum + s.gzip, 0) / 1024).toFixed(0)} KiB gzip · Produktionsbundle: +0 B`;
  }).catch(() => { root.querySelector('.bundle-info').textContent = 'Bundlegrößen nicht verfügbar'; });
  window.addEventListener('pagehide', () => { clearInterval(sampleTimer); cancelAnimationFrame(lab.raf); unsubscribe(); for (const panel of lab.panels) panel.destroy(); }, { once: true });
  return lab;
}

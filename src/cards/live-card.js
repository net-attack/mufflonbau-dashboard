import { localized, resolveLanguage, translations } from '../core/i18n.js';
import { appearanceMode, isOffline, monitorWarnings, numericState } from '../core/state.js';

import { element, svgElement, icon, navigateLink } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
const liveStyles = `
  :host { display:block; min-width:0; font-family:Inter,'Avenir Next',system-ui,sans-serif; }
  * { box-sizing:border-box; } ha-card { display:block; padding:26px; border-radius:24px; background:var(--mb-surface); color:var(--mb-ink); border:1px solid var(--mb-line); box-shadow:none; }
  h2 { margin:0; font-size:17px; letter-spacing:-.4px; font-weight:650; } p { margin:6px 0; }
  .section-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; } .eyebrow { font-size:10px; font-weight:650; letter-spacing:2px; text-transform:uppercase; color:var(--mb-muted); }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; }
  button { min-width:0; text-align:start; font:inherit; color:inherit; border:0; background:transparent; cursor:pointer; }
  button:disabled { opacity:.5; cursor:default; } button:focus-visible,a:focus-visible { outline:2px solid var(--mb-accent); outline-offset:4px; }
  strong,small { display:block; } small { color:var(--mb-muted); font-size:11px; line-height:1.6; margin-top:5px; }
  svg { flex-shrink:0; } .icon-disc { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:13px; background:var(--mb-soft); color:var(--mb-accent); }
  .room-tile { padding:18px; border:1px solid var(--mb-line); border-radius:20px; min-width:0; } .room-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
  .room-link { color:var(--mb-muted); } .room-link svg { width:17px; } .climate-button { padding:0; width:100%; } .climate-button strong { font-size:12px; font-weight:550; color:var(--mb-muted); }
  .value { font-size:34px; letter-spacing:-1.5px; font-weight:500; margin-top:10px; line-height:1.3; } .room-tile.lit .icon-disc { background:var(--mb-active); }
  .warning { display:flex; gap:12px; align-items:center; padding:12px 0; width:100%; border-bottom:1px solid var(--mb-line); } .warning:last-child { border:0; } .warning .icon-disc { color:#b67545; } .warning strong { overflow-wrap:anywhere; font-size:12px; font-weight:600; }
  .healthy { display:flex; align-items:center; gap:12px; color:var(--mb-accent); font-size:13px; line-height:1.7; padding:8px 0; }
  .hero { padding:32px; background:var(--mb-hero); overflow:hidden; position:relative; border:0; }
  .hero:after { content:''; position:absolute; width:330px; height:330px; border:1px solid var(--mb-accent); opacity:.1; border-radius:50%; right:90px; top:-170px; box-shadow:0 0 0 50px var(--mb-hero),0 0 0 51px var(--mb-accent); pointer-events:none; }
  .header { display:flex; align-items:center; justify-content:space-between; gap:24px; position:relative; z-index:1; }
  h1 { margin:12px 0; font-size:clamp(30px,3.3vw,48px); letter-spacing:-2px; line-height:1.15; font-weight:550; }
  .hero-copy { color:var(--mb-muted); font-size:12px; } .clock { font-size:52px; font-weight:400; letter-spacing:-3px; font-variant-numeric:tabular-nums; line-height:1.2; }
  .clock-wrap { text-align:right; } .weather { display:inline-flex; align-items:center; gap:8px; font-size:13px; color:var(--mb-accent); margin-top:12px; }
  .event { display:flex; align-items:center; gap:12px; border-top:1px solid var(--mb-line); margin-top:25px; padding-top:18px; font-size:12px; } .event small { margin:0; }
  .people { display:flex; gap:13px; align-items:center; padding:12px 0; } .avatar { width:42px; height:42px; border-radius:50%; display:grid; place-items:center; background:var(--mb-soft); font-size:13px; font-weight:600; color:var(--mb-accent); } .people strong { font-size:13px; } .people small { margin:2px 0 0; }
  .person-state { margin-left:auto; font-size:10px; color:var(--mb-muted); } .person-state.home { background:var(--mb-active); color:var(--mb-accent); padding:6px 9px; border-radius:8px; }
  .device { padding:16px; border:1px solid var(--mb-line); border-radius:18px; display:flex; flex-direction:column; gap:15px; } .device.is-on { background:var(--mb-soft); border-color:transparent; }
  .device-top { display:flex; justify-content:space-between; align-items:center; } .device-label { padding:0; width:100%; } .device strong { font-size:12px; line-height:1.5; overflow-wrap:anywhere; }
  .switch { width:36px; height:22px; padding:3px; background:var(--mb-line); border-radius:20px; } .switch:after { content:''; display:block; width:16px; height:16px; border-radius:50%; background:var(--mb-surface); transition:transform .15s; }
  .switch[aria-checked=true] { background:var(--mb-accent); } .switch[aria-checked=true]:after { transform:translateX(14px); }
  .robot { display:flex; align-items:center; gap:16px; padding:8px 0 18px; } .robot .icon-disc { width:62px; height:62px; border-radius:50%; } .robot strong { font-size:13px; line-height:1.5; }
  .link { display:flex; align-items:center; justify-content:space-between; padding-top:15px; border-top:1px solid var(--mb-line); font-size:12px; color:var(--mb-accent); text-decoration:none; }
  .floor-map { width:100%; height:auto; max-height:65vh; margin-top:12px; } .floor-map text { fill:var(--mb-ink); pointer-events:none; }
  .floor-map rect { stroke:var(--mb-line); stroke-width:3; fill:var(--mb-soft); } .floor-map .lit { fill:var(--mb-active); } .floor-map .offline { stroke:#b67545; stroke-dasharray:6; }
  .room-name { font-size:18px; font-weight:600; } .room-value { font-size:17px; } .message { color:var(--mb-muted); line-height:1.7; font-size:13px; }
  @media(max-width:700px) { ha-card { padding:20px; } .hero { padding:26px 22px; } .header { align-items:start; flex-wrap:wrap; } .clock { font-size:42px; } .clock-wrap { text-align:left; } h1 { font-size:34px; } .grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } .room-tile { padding:14px; } .value { font-size:28px; } .device { padding:14px; } }
  @media(prefers-reduced-motion:reduce) { .switch:after { transition:none; } }
`;
export class MufflonbauLiveCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  setConfig(config) {
    if (!['header', 'climate', 'floorplan', 'warnings', 'people', 'devices', 'cleaning', 'message'].includes(config.mode)) throw new Error('Mufflonbau: unsupported live card mode.');
    this._config = config;
    this._watched = [...new Set([
      config.weather, ...(config.calendars ?? []), ...(config.entities ?? []), ...(config.people ?? []),
      ...Object.values(config.cleaning ?? {}), ...(config.monitors ?? []).map(item => item.entity),
      ...(config.rooms ?? []).flatMap(room => [room.temperature, room.humidity, room.dew_point, ...(room.lights ?? [])]),
      config.appearance?.night_person, config.appearance?.ambient_person,
    ].filter(Boolean))];
    this._render();
    this._startClock();
  }
  set hass(hass) {
    const previous = this._hass;
    this._hass = hass;
    if (!previous || previous.locale !== hass.locale || previous.language !== hass.language ||
      previous.themes !== hass.themes || this._watched?.some(id => previous.states[id] !== hass.states[id])) this._render();
  }
  getCardSize() { return this._config?.mode === 'floorplan' ? 7 : 3; }
  connectedCallback() { this._startClock(); this._render(); }
  disconnectedCallback() { clearInterval(this._timer); this._timer = undefined; }
  _startClock() {
    clearInterval(this._timer);
    this._timer = undefined;
    if (this.isConnected && this._config?.mode === 'header') this._timer = setInterval(() => this._render(), 30000);
  }
  _moreInfo(id) {
    if (id) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true }));
  }
  _value(id, fallbackUnit) {
    const state = this._hass.states[id];
    const number = numericState(state);
    const text = translations[this._language];
    if (number === null) return text.offline;
    return `${new Intl.NumberFormat(this._language, { maximumFractionDigits: 1 }).format(number)} ${state.attributes?.unit_of_measurement ?? fallbackUnit}`;
  }
  _render() {
    if (!this._config || !this._hass) return;
    const language = resolveLanguage(this._config, this._hass);
    this._language = language;
    const text = translations[language];
    const focusedEntity = this.shadowRoot.activeElement?.dataset?.entity;
    const focusedRoom = this.shadowRoot.activeElement?.getAttribute('data-room');
    const style = element('style', liveStyles);
    const card = element('ha-card');
    card.className = appearanceMode(this._config.appearance, this._hass.states, this._hass.themes?.darkMode);
    applyTheme(card, card.className);
    if (this._config.mode === 'header') this._header(card, text);
    if (this._config.mode === 'climate') this._climate(card, text);
    if (this._config.mode === 'warnings') this._warnings(card, text);
    if (this._config.mode === 'floorplan') this._floorplan(card, text);
    if (this._config.mode === 'people') this._people(card, text);
    if (this._config.mode === 'devices') this._devices(card, text);
    if (this._config.mode === 'cleaning') this._cleaning(card, text);
    if (this._config.mode === 'message') card.append(element('p', this._config.content, 'message'));
    this.shadowRoot.replaceChildren(style, card);
    if (focusedEntity) [...this.shadowRoot.querySelectorAll('button')].find(button => button.dataset.entity === focusedEntity)?.focus();
    if (focusedRoom) [...this.shadowRoot.querySelectorAll('a')].find(link => link.getAttribute('data-room') === focusedRoom)?.focus();
  }
  _section(card, title, label) {
    const head = element('div', undefined, 'section-head');
    head.append(element('h2', title));
    if (label !== undefined) head.append(element('span', String(label), 'eyebrow'));
    card.append(head);
  }
  _header(card, text) {
    card.classList.add('hero');
    const now = new Date();
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: this._hass.config?.time_zone }).format(now));
    const greeting = hour < 12 ? text.morning : hour < 18 ? text.afternoon : text.evening;
    const header = element('div', undefined, 'header');
    const info = element('div');
    info.append(element('span', text.yourSpace, 'eyebrow'), element('h1', greeting), element('p', this._config.title ?? 'Mufflonbau', 'hero-copy'));
    const weather = this._hass.states[this._config.weather];
    if (weather && !isOffline(weather)) {
      const weatherLine = element('div', undefined, 'weather');
      weatherLine.append(icon('sun'), element('span', `${weather.attributes.temperature ?? '–'} ${weather.attributes.temperature_unit ?? '°C'}`));
      info.append(weatherLine);
    }
    const clock = element('div', undefined, 'clock-wrap');
    clock.append(element('div', new Intl.DateTimeFormat(this._language, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: this._hass.config?.time_zone }).format(now), 'clock'),
      element('small', new Intl.DateTimeFormat(this._language, { weekday: 'long', day: 'numeric', month: 'long', timeZone: this._hass.config?.time_zone }).format(now)));
    header.append(info, clock); card.append(header);
    for (const id of this._config.calendars ?? []) {
      const calendar = this._hass.states[id];
      if (!calendar || isOffline(calendar)) continue;
      const row = element('div', undefined, 'event');
      const detail = element('div');
      detail.append(element('strong', calendar.attributes.message ?? text.noEvents));
      const start = calendar.attributes.start_time;
      if (start && Number.isFinite(new Date(start).getTime())) detail.append(element('small', new Intl.DateTimeFormat(this._language, { dateStyle: 'medium', timeStyle: 'short', timeZone: this._hass.config?.time_zone }).format(new Date(start))));
      row.append(icon('calendar'), detail); card.append(row);
    }
  }
  _climate(card, text) {
    this._section(card, text.rooms, String((this._config.rooms ?? []).length).padStart(2, '0'));
    const grid = element('div', undefined, 'grid');
    for (const room of this._config.rooms ?? []) {
      const lit = (room.lights ?? []).some(id => this._hass.states[id]?.state === 'on');
      const tile = element('article', undefined, `room-tile${lit ? ' lit' : ''}`);
      const top = element('div', undefined, 'room-top');
      const disc = element('span', undefined, 'icon-disc'); disc.append(icon('rooms'));
      const link = element('a', undefined, 'room-link');
      link.setAttribute('aria-label', localized(room.name, this._language)); link.setAttribute('data-room', room.id); navigateLink(link, `room-${room.id}`); link.append(icon('arrow')); top.append(disc, link);
      const button = element('button', undefined, 'climate-button');
      button.type = 'button';
      button.dataset.entity = room.temperature ?? room.humidity ?? room.dew_point ?? '';
      button.append(element('strong', localized(room.name, this._language)));
      if (room.temperature) button.append(element('div', this._value(room.temperature, '°C'), 'value'));
      if (room.humidity) button.append(element('small', `${this._value(room.humidity, '%')} · ${text.humidity}`));
      if (room.dew_point) button.append(element('small', `${text.dewPoint}: ${this._value(room.dew_point, '°C')}`));
      button.addEventListener('click', () => button.dataset.entity ? this._moreInfo(button.dataset.entity) : link.click());
      tile.append(top, button); grid.append(tile);
    }
    card.append(grid);
  }
  _warnings(card, text) {
    const warnings = monitorWarnings(this._config.monitors ?? [], this._hass.states, this._language);
    this._section(card, text.system, warnings.length ? warnings.length : '✓');
    if (!warnings.length) {
      const healthy = element('div', undefined, 'healthy'); healthy.append(icon('system'), element('span', text.healthy)); card.append(healthy);
    }
    for (const warning of this._config.compact ? warnings.slice(0, 3) : warnings) {
      const button = element('button', undefined, 'warning'); button.type = 'button'; button.dataset.entity = warning.entity;
      const disc = element('span', undefined, 'icon-disc'); disc.append(icon('system'));
      const detail = element('span'); detail.append(element('strong', warning.name), element('small', warning.detail));
      button.append(disc, detail); button.addEventListener('click', () => this._moreInfo(warning.entity)); card.append(button);
    }
    card.setAttribute('aria-live', 'polite');
    if (this._config.compact) this._link(card, 'system', text.allDetails);
  }
  _name(id) { return this._hass.states[id]?.attributes?.friendly_name ?? id.split('.').at(-1).replaceAll('_', ' '); }
  _state(id, text) {
    const state = this._hass.states[id];
    if (isOffline(state)) return text.offline;
    if (text.states[state.state]) return text.states[state.state];
    return this._hass.formatEntityState?.(state) ?? `${state.state}${state.attributes?.unit_of_measurement ? ` ${state.attributes.unit_of_measurement}` : ''}`;
  }
  _people(card, text) {
    this._section(card, text.people);
    for (const id of this._config.people ?? []) {
      const row = element('div', undefined, 'people');
      const name = this._name(id); const info = element('button'); info.type = 'button'; info.dataset.entity = id;
      info.append(element('strong', name)); info.addEventListener('click', () => this._moreInfo(id));
      row.append(element('span', name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase(), 'avatar'), info,
        element('span', this._state(id, text), `person-state${this._hass.states[id]?.state === 'home' ? ' home' : ''}`)); card.append(row);
    }
  }
  _devices(card, text) {
    this._section(card, this._config.title ?? text.lights, (this._config.entities ?? []).length);
    const grid = element('div', undefined, 'grid');
    for (const id of this._config.entities ?? []) {
      const state = this._hass.states[id]; const on = state?.state === 'on';
      const tile = element('article', undefined, `device${on ? ' is-on' : ''}`);
      const top = element('div', undefined, 'device-top'); const disc = element('span', undefined, 'icon-disc'); disc.append(icon(id.startsWith('light.') ? 'light' : 'expert')); top.append(disc);
      if (/^(light|switch)\./.test(id)) {
        const toggle = element('button', undefined, 'switch'); toggle.type = 'button'; toggle.disabled = isOffline(state);
        toggle.setAttribute('role', 'switch'); toggle.setAttribute('aria-checked', String(on)); toggle.setAttribute('aria-label', this._name(id)); toggle.dataset.entity = id;
        toggle.addEventListener('click', async () => {
          toggle.disabled = true;
          try { await this._hass.callService('homeassistant', 'toggle', {}, { entity_id: id }); }
          catch { const error = element('small', text.actionFailed); error.setAttribute('role', 'alert'); tile.append(error); }
          finally { toggle.disabled = isOffline(this._hass.states[id]); }
        }); top.append(toggle);
      }
      const info = element('button', undefined, 'device-label'); info.type = 'button'; info.dataset.entity = id;
      info.append(element('strong', this._name(id)), element('small', this._state(id, text))); info.addEventListener('click', () => this._moreInfo(id));
      tile.append(top, info); grid.append(tile);
    }
    card.append(grid);
  }
  _link(card, path, title) {
    const link = element('a', undefined, 'link'); navigateLink(link, path); link.append(element('span', title), icon('arrow')); card.append(link);
  }
  _cleaning(card, text) {
    this._section(card, text.cleaning);
    const config = this._config.cleaning; const row = element('div', undefined, 'robot'); const disc = element('span', undefined, 'icon-disc'); disc.append(icon('cleaning'));
    const detail = element('div'); detail.append(element('strong', this._name(config.entity)), element('small', this._state(config.entity, text)));
    if (config.battery) detail.append(element('small', `${text.battery} · ${this._value(config.battery, '%')}`));
    row.append(disc, detail); card.append(row); this._link(card, 'cleaning', text.allDetails);
  }
  _floorplan(card, text) {
    this._section(card, text.rooms, text.floorplan);
    const rooms = this._config.rooms ?? [];
    const positions = rooms.map((room, index) => room.position ?? { x: (index % 3) * 280, y: Math.floor(index / 3) * 180, width: 260, height: 160 });
    const width = Math.max(1, ...positions.map(position => position.x + position.width));
    const height = Math.max(1, ...positions.map(position => position.y + position.height));
    const svg = svgElement('svg', { viewBox: `-4 -4 ${width + 8} ${height + 8}`, role: 'group', class: 'floor-map', 'aria-label': text.rooms });
    rooms.forEach((room, index) => {
      const position = positions[index];
      const link = svgElement('a', { 'data-room': room.id, 'aria-label': localized(room.name, this._language) });
      navigateLink(link, `room-${room.id}`);
      const lit = (room.lights ?? []).some(id => this._hass.states[id]?.state === 'on');
      const offline = [room.temperature, room.humidity].filter(Boolean).some(id => isOffline(this._hass.states[id]));
      link.append(svgElement('rect', { ...position, rx: 12, class: `${lit ? 'lit' : ''} ${offline ? 'offline' : ''}` }));
      link.append(svgElement('text', { x: position.x + 14, y: position.y + 28, class: 'room-name' }, localized(room.name, this._language)));
      if (room.temperature) link.append(svgElement('text', { x: position.x + 14, y: position.y + 58, class: 'room-value' }, this._value(room.temperature, '°C')));
      if (room.humidity) link.append(svgElement('text', { x: position.x + 14, y: position.y + 82, class: 'room-value' }, this._value(room.humidity, '%')));
      svg.append(link);
    });
    card.append(svg);
  }
}

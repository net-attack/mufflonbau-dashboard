import { localized, resolveLanguage, translations } from '../core/i18n.js';
import { appearanceMode, isOffline, monitorWarnings, numericState } from '../core/state.js';

const liveStyles = `
  :host { display:block; min-width:0; }
  ha-card { display:block; box-sizing:border-box; padding:20px; border-radius:22px; color:var(--primary-text-color); }
  ha-card.ambient { background:linear-gradient(145deg,#f8f3e8,#e2d8c6); color:#3a342d; --muted:#665f54; --accent:#507e63; }
  ha-card.night { background:linear-gradient(145deg,#07111a,#08232e); color:#eef8fc; --muted:#b4d3de; --accent:#64e7b5; }
  h2 { margin:0 0 12px; font-size:18px; } p { margin:6px 0; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(145px,1fr)); gap:12px; }
  button { min-width:0; overflow-wrap:anywhere; text-align:start; font:inherit; color:inherit; padding:14px; border-radius:16px; border:1px solid color-mix(in srgb,currentColor 18%,transparent); background:transparent; cursor:pointer; }
  button:focus-visible, a:focus-visible { outline:3px solid var(--accent); outline-offset:2px; }
  strong, small { display:block; } small { color:var(--muted); margin-top:5px; }
  .value { font-size:24px; margin-top:8px; } .warning { border-inline-start:4px solid #bf6149; }
  .clock { font-size:30px; font-variant-numeric:tabular-nums; } svg { width:100%; height:auto; max-height:72vh; }
  svg text { fill:currentColor; pointer-events:none; } svg rect { stroke:var(--muted); stroke-width:3; fill:var(--card-background-color,#f4efe4); }
  .night svg rect { fill:#173642; } .night svg .lit { fill:#506238; }
  svg .lit { fill:#e9d68e; } svg .offline { stroke:#bf6149; stroke-dasharray:6; }
  .room-name { font-size:18px; font-weight:600; } .room-value { font-size:17px; }
  a { color:inherit; cursor:pointer; } .header { display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; }
`;
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function svgElement(tag, attributes = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
export class MufflonbauLiveCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  setConfig(config) {
    if (!['header', 'climate', 'floorplan', 'warnings'].includes(config.mode)) throw new Error('Mufflonbau: unsupported live card mode.');
    this._config = config;
    this._watched = [...new Set([
      config.weather, ...(config.calendars ?? []), ...(config.monitors ?? []).map(item => item.entity),
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
    if (this._config.mode === 'header') this._header(card, text);
    if (this._config.mode === 'climate') this._climate(card, text);
    if (this._config.mode === 'warnings') this._warnings(card, text);
    if (this._config.mode === 'floorplan') this._floorplan(card, text);
    this.shadowRoot.replaceChildren(style, card);
    if (focusedEntity) [...this.shadowRoot.querySelectorAll('button')].find(button => button.dataset.entity === focusedEntity)?.focus();
    if (focusedRoom) [...this.shadowRoot.querySelectorAll('a')].find(link => link.getAttribute('data-room') === focusedRoom)?.focus();
  }
  _header(card, text) {
    const header = element('div', undefined, 'header');
    const info = element('div');
    info.append(element('h2', this._config.title ?? 'Mufflonbau'));
    info.append(element('p', new Intl.DateTimeFormat(this._language, { dateStyle: 'full', timeZone: this._hass.config?.time_zone }).format(new Date())));
    header.append(info, element('div', new Intl.DateTimeFormat(this._language, { hour: '2-digit', minute: '2-digit', timeZone: this._hass.config?.time_zone }).format(new Date()), 'clock'));
    card.append(header);
    const weather = this._hass.states[this._config.weather];
    if (weather && !isOffline(weather)) card.append(element('p', `${weather.attributes.friendly_name ?? ''} ${weather.attributes.temperature ?? '–'} ${weather.attributes.temperature_unit ?? ''}`));
    for (const id of this._config.calendars ?? []) {
      const calendar = this._hass.states[id];
      if (!calendar || isOffline(calendar)) continue;
      const row = element('p', `${text.calendar}: ${calendar.attributes.message ?? '–'}`);
      const start = calendar.attributes.start_time;
      if (start && Number.isFinite(new Date(start).getTime())) row.append(element('small', new Intl.DateTimeFormat(this._language, { dateStyle: 'medium', timeStyle: 'short', timeZone: this._hass.config?.time_zone }).format(new Date(start))));
      card.append(row);
    }
  }
  _climate(card, text) {
    const grid = element('div', undefined, 'grid');
    for (const room of this._config.rooms ?? []) {
      const button = element('button');
      button.type = 'button';
      button.dataset.entity = room.temperature ?? room.humidity ?? room.dew_point ?? '';
      button.append(element('strong', localized(room.name, this._language)));
      if (room.temperature) button.append(element('div', this._value(room.temperature, '°C'), 'value'));
      if (room.humidity) button.append(element('small', `${text.humidity}: ${this._value(room.humidity, '%')}`));
      if (room.dew_point) button.append(element('small', `${text.dewPoint}: ${this._value(room.dew_point, '°C')}`));
      button.addEventListener('click', () => this._moreInfo(button.dataset.entity));
      grid.append(button);
    }
    card.append(grid);
  }
  _warnings(card, text) {
    card.append(element('h2', text.system));
    const warnings = monitorWarnings(this._config.monitors ?? [], this._hass.states, this._language);
    if (!warnings.length) card.append(element('p', text.healthy));
    const grid = element('div', undefined, 'grid');
    for (const warning of warnings) {
      const button = element('button', undefined, 'warning');
      button.type = 'button';
      button.dataset.entity = warning.entity;
      button.append(element('strong', warning.name), element('small', warning.detail));
      button.addEventListener('click', () => this._moreInfo(warning.entity));
      grid.append(button);
    }
    card.setAttribute('aria-live', 'polite');
    card.append(grid);
  }
  _floorplan(card, text) {
    card.append(element('h2', text.rooms));
    const rooms = this._config.rooms ?? [];
    const positions = rooms.map((room, index) => room.position ?? { x: (index % 3) * 280, y: Math.floor(index / 3) * 180, width: 260, height: 160 });
    const width = Math.max(1, ...positions.map(position => position.x + position.width));
    const height = Math.max(1, ...positions.map(position => position.y + position.height));
    const svg = svgElement('svg', { viewBox: `-4 -4 ${width + 8} ${height + 8}`, role: 'group', 'aria-label': text.rooms });
    rooms.forEach((room, index) => {
      const position = positions[index];
      const path = `room-${room.id}`;
      const target = new URL(window.location.href);
      const segments = target.pathname.split('/').filter(Boolean);
      if (segments.length > 1) segments.pop();
      target.pathname = `/${segments.join('/')}/${path}`;
      target.hash = '';
      const link = svgElement('a', { href: target.pathname, 'data-room': room.id, 'aria-label': localized(room.name, this._language) });
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        window.history.pushState(null, '', target.pathname);
        window.dispatchEvent(new Event('location-changed'));
      });
      const lit = (room.lights ?? []).some(id => this._hass.states[id]?.state === 'on');
      const offline = [room.temperature, room.humidity].filter(Boolean).some(id => isOffline(this._hass.states[id]));
      link.append(svgElement('rect', { ...position, rx: 5, class: `${lit ? 'lit' : ''} ${offline ? 'offline' : ''}` }));
      link.append(svgElement('text', { x: position.x + 14, y: position.y + 28, class: 'room-name' }, localized(room.name, this._language)));
      if (room.temperature) link.append(svgElement('text', { x: position.x + 14, y: position.y + 58, class: 'room-value' }, this._value(room.temperature, '°C')));
      if (room.humidity) link.append(svgElement('text', { x: position.x + 14, y: position.y + 82, class: 'room-value' }, this._value(room.humidity, '%')));
      svg.append(link);
    });
    card.append(svg);
  }
}

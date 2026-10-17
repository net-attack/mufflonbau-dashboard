import { liveStyles } from '../design/live-styles.js';
import { localized, resolveLanguage, translations } from '../core/i18n.js';
import { appearanceMode, isOffline, monitorWarnings, numericState, stateProblem } from '../core/state.js';

import { element, svgElement, icon, iconPath, navigateLink, roomIcon } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
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
      ...(config.rooms ?? []).flatMap(room => [room.temperature, room.humidity, room.dew_point, ...(room.lights ?? []), ...(room.objects ?? []).map(item => item.entity)]),
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
    if (number === null) return stateProblem(state, this._language) ?? text.invalidValue;
    return `${new Intl.NumberFormat(this._language, { maximumFractionDigits: 1 }).format(number)} ${state.attributes?.unit_of_measurement ?? fallbackUnit}`;
  }
  _statusIcon(message) {
    const status = icon('warning'); status.setAttribute('role', 'img');
    status.setAttribute('aria-label', message); status.setAttribute('title', message); return status;
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
    card.className = `${appearanceMode(this._config.appearance, this._hass.states, this._hass.themes?.darkMode)}${this._config.compact ? ' compact' : ''}`;
    applyTheme(card, card.className, this._config.appearance?.theme);
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
    if (this._config.appearance?.theme === 'calm') return this._calmHeader(card, text);
    card.classList.add('hero');
    const now = new Date();
    const timezone = this._hass.config?.time_zone;
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: timezone }).format(now));
    const grid = element('div', undefined, 'overview-grid');
    const welcome = element('section');
    welcome.append(element('h1', hour < 12 ? text.morning : hour < 18 ? text.afternoon : text.evening), element('div', new Intl.DateTimeFormat(this._language, { dateStyle: 'full', timeStyle: 'short', timeZone: timezone }).format(now), 'overview-date'));
    const weather = this._hass.states[this._config.weather];
    if (weather && !isOffline(weather)) {
      const chips = element('div', undefined, 'weather-chips');
      const chip = element('span', undefined, 'chip'); chip.append(icon('sun'), element('span', `${weather.attributes.temperature ?? '–'} ${weather.attributes.temperature_unit ?? '°C'}`)); chips.append(chip);
      if (weather.attributes.humidity !== undefined) chips.append(element('span', `${weather.attributes.humidity}% · ${text.humidity}`, 'chip'));
      if (weather.attributes.wind_speed !== undefined) chips.append(element('span', `${weather.attributes.wind_speed} ${weather.attributes.wind_speed_unit ?? ''} · ${text.wind}`, 'chip'));
      welcome.append(chips);
    }
    const climate = element('section'); climate.append(element('h2', text.indoorClimate));
    const temps = (this._config.rooms ?? []).map(room => this._hass.states[room.temperature]).filter(state => numericState(state) !== null);
    const unit = temps[0]?.attributes?.unit_of_measurement ?? '°C';
    const compatible = temps.filter(state => (state.attributes?.unit_of_measurement ?? '°C') === unit);
    const humidities = (this._config.rooms ?? []).map(room => numericState(this._hass.states[room.humidity])).filter(value => value !== null);
    if (compatible.length) {
      const average = compatible.reduce((sum, state) => sum + numericState(state), 0) / compatible.length;
      const reading = element('div', undefined, 'reading'); reading.append(icon('climate'), element('strong', `${new Intl.NumberFormat(this._language, { maximumFractionDigits: 1 }).format(average)} ${unit}`)); climate.append(reading);
      const pills = element('div', undefined, 'climate-pills'); pills.append(element('span', `${compatible.length} · ${text.rooms}`, 'chip'));
      if (humidities.length) pills.append(element('span', `${Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length)}% · ${text.humidity}`, 'chip'));
      climate.append(pills);
    } else climate.append(element('small', text.noReadings));
    const agenda = element('section', undefined, 'agenda'); agenda.append(element('h2', text.calendar));
    let events = 0;
    for (const id of this._config.calendars ?? []) {
      const state = this._hass.states[id]; if (isOffline(state) || !state.attributes?.message) continue;
      const start = new Date(state.attributes.start_time);
      const entry = element('div', undefined, 'calendar-entry');
      if (Number.isFinite(start.getTime())) entry.append(element('div', new Intl.DateTimeFormat(this._language, { day: 'numeric', timeZone: timezone }).format(start), 'calendar-date'));
      const detail = element('div'); detail.append(element('strong', state.attributes.message));
      if (Number.isFinite(start.getTime())) detail.append(element('small', new Intl.DateTimeFormat(this._language, { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(start)));
      entry.append(detail); agenda.append(entry); events++;
    }
    if (!events) agenda.append(element('small', text.noEvents));
    grid.append(welcome, climate, agenda); card.append(grid);
  }
  _calmHeader(card, text) {
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
    card.classList.add('room-board');
    this._section(card, text.rooms, String((this._config.rooms ?? []).length).padStart(2, '0'));
    const grid = element('div', undefined, 'grid');
    for (const room of this._config.rooms ?? []) {
      const lit = (room.lights ?? []).some(id => this._hass.states[id]?.state === 'on');
      const tile = element('article', undefined, `room-tile${lit ? ' lit' : ''}`);
      const top = element('div', undefined, 'room-top');
      const disc = element('span', undefined, 'icon-disc'); disc.append(icon(roomIcon(room)));
      const link = element('a', undefined, 'room-link');
      link.setAttribute('aria-label', localized(room.name, this._language)); link.setAttribute('data-room', room.id); navigateLink(link, `room-${room.id}`); link.append(icon('arrow')); top.append(disc, link);
      for (const id of (room.lights ?? []).slice(0, 3)) {
        const control = element('button', undefined, 'circle-toggle'); control.type = 'button'; control.dataset.entity = id;
        control.setAttribute('role', 'switch'); control.setAttribute('aria-checked', String(this._hass.states[id]?.state === 'on')); control.setAttribute('aria-label', this._name(id));
        control.disabled = isOffline(this._hass.states[id]); control.append(icon('light'));
        control.addEventListener('click', async () => {
          control.disabled = true;
          try { await this._hass.callService('homeassistant', 'toggle', {}, { entity_id: id }); }
          catch { const error = element('small', text.actionFailed); error.setAttribute('role', 'alert'); tile.append(error); }
          finally { control.disabled = isOffline(this._hass.states[id]); }
        }); top.append(control);
      }
      const button = element('button', undefined, 'climate-button');
      button.type = 'button';
      button.dataset.entity = room.temperature ?? room.humidity ?? room.dew_point ?? '';
      button.append(element('strong', localized(room.name, this._language)));
      if (room.temperature) {
        const reading = element('div', undefined, `value${numericState(this._hass.states[room.temperature]) === null ? ' status-value' : ''}`);
        if (numericState(this._hass.states[room.temperature]) === null) reading.append(this._statusIcon(stateProblem(this._hass.states[room.temperature], this._language) ?? text.invalidValue));
        else reading.textContent = this._value(room.temperature, '°C');
        button.append(reading);
      }
      if (room.humidity) {
        const value = numericState(this._hass.states[room.humidity]);
        const humidity = element('small');
        if (value === null) humidity.append(this._statusIcon(stateProblem(this._hass.states[room.humidity], this._language) ?? text.invalidValue), element('span', ` · ${text.humidity}`));
        else humidity.textContent = `${this._value(room.humidity, '%')} · ${text.humidity}`;
        button.append(humidity);
      }
      if (room.dew_point) {
        const value = numericState(this._hass.states[room.dew_point]);
        const dewPoint = element('small');
        if (value === null) dewPoint.append(element('span', `${text.dewPoint}: `), this._statusIcon(stateProblem(this._hass.states[room.dew_point], this._language) ?? text.invalidValue));
        else dewPoint.textContent = `${text.dewPoint}: ${this._value(room.dew_point, '°C')}`;
        button.append(dewPoint);
      }
      button.addEventListener('click', () => button.dataset.entity ? this._moreInfo(button.dataset.entity) : link.click());
      const art = element('span', undefined, 'room-art'); art.setAttribute('aria-hidden', 'true'); art.append(icon(roomIcon(room)));
      tile.append(top, button, art); grid.append(tile);
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
      if (warning.name !== warning.entity) detail.append(element('small', warning.entity, 'entity-id'));
      button.append(disc, detail); button.addEventListener('click', () => this._moreInfo(warning.entity)); card.append(button);
    }
    card.setAttribute('aria-live', 'polite');
    if (this._config.compact) this._link(card, 'system', text.allDetails);
  }
  _name(id) { return this._hass.states[id]?.attributes?.friendly_name ?? id.split('.').at(-1).replaceAll('_', ' '); }
  _state(id, text) {
    const state = this._hass.states[id];
    if (isOffline(state)) return stateProblem(state, this._language);
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
      info.append(element('strong', this._name(id)), element('small', this._state(id, text)));
      if (isOffline(state)) info.append(element('small', id, 'entity-id'));
      info.addEventListener('click', () => this._moreInfo(id));
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
    if (isOffline(this._hass.states[config.entity])) detail.append(element('small', config.entity, 'entity-id'));
    if (config.battery) detail.append(element('small', `${text.battery} · ${this._value(config.battery, '%')}`));
    row.append(disc, detail); card.append(row); this._link(card, 'cleaning', text.allDetails);
  }
  _floorplan(card, text) {
    this._section(card, text.rooms, text.floorplan);
    const rooms = this._config.rooms ?? [];
    const positions = rooms.map((room, index) => room.position ?? { x: (index % 3) * 280, y: Math.floor(index / 3) * 180, width: 260, height: 160 });
    const polygons = positions.map(position => position.points ? [position.points] : position.parts ?? [[
      [position.x, position.y], [position.x + position.width, position.y],
      [position.x + position.width, position.y + position.height], [position.x, position.y + position.height],
    ]]);
    const allPoints = polygons.flat(2);
    const minX = Math.min(0, ...allPoints.map(point => point[0]));
    const minY = Math.min(0, ...allPoints.map(point => point[1]));
    const width = Math.max(1, ...allPoints.map(point => point[0])) - minX;
    const height = Math.max(1, ...allPoints.map(point => point[1])) - minY;
    const svg = svgElement('svg', { viewBox: `${minX - 3} ${minY - 3} ${width + 6} ${height + 6}`, role: 'group', class: 'floor-map', 'aria-label': text.rooms });
    for (const wall of this._config.walls ?? []) {
      svg.append(svgElement('polyline', { points: wall.map(point => point.join(',')).join(' '), class: 'floor-wall' }));
    }
    rooms.forEach((room, index) => {
      const position = positions[index];
      const points = polygons[index].flat();
      const bounds = { left: Math.min(...points.map(point => point[0])), top: Math.min(...points.map(point => point[1])), right: Math.max(...points.map(point => point[0])), bottom: Math.max(...points.map(point => point[1])) };
      const center = [(bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2];
      const link = svgElement('a', { 'data-room': room.id, 'aria-label': localized(room.name, this._language) });
      navigateLink(link, `room-${room.id}`);
      const lit = (room.lights ?? []).some(id => this._hass.states[id]?.state === 'on');
      const offline = [room.temperature, room.humidity].filter(Boolean).some(id => isOffline(this._hass.states[id]));
      for (const polygon of polygons[index]) {
        link.append(svgElement('polygon', { points: polygon.map(point => point.join(',')).join(' '), class: `${lit ? 'lit' : ''} ${offline ? 'offline' : ''}` }));
      }
      const textAnchor = polygons[index].length > 1 ? 'middle' : 'start';
      link.append(svgElement('text', { x: center[0], y: center[1] - 5, class: 'room-name', 'text-anchor': textAnchor }, localized(room.name, this._language)));
      if (room.temperature) link.append(svgElement('text', { x: center[0], y: center[1] + 18, class: 'room-value', 'text-anchor': textAnchor }, this._value(room.temperature, '°C')));
      if (room.humidity) link.append(svgElement('text', { x: center[0], y: center[1] + 38, class: 'room-value', 'text-anchor': textAnchor }, this._value(room.humidity, '%')));
      svg.append(link);
      for (const item of room.objects ?? []) {
        const x = bounds.left + (bounds.right - bounds.left) * item.position.x;
        const y = bounds.top + (bounds.bottom - bounds.top) * item.position.y;
        const state = item.entity ? this._hass.states[item.entity] : undefined;
        const active = state?.state === 'on';
        const label = localized(item.name, this._language);
        const marker = svgElement('a', { href: '#', role: 'button', tabindex: '0', 'aria-label': item.entity ? `${label} · ${this._name(item.entity)}` : `${label} · ${localized(room.name, this._language)}`, 'data-marker': item.id ?? label });
        marker.append(svgElement('circle', { cx: x, cy: y, r: 19, class: `map-marker${active ? ' active' : ''}${isOffline(state) ? ' unavailable' : ''}` }));
        marker.append(svgElement('path', { d: iconPath(item.icon), transform: `translate(${x - 10} ${y - 10}) scale(.83)`, class: 'map-marker-icon' }));
        marker.append(svgElement('title', {}, label));
        marker.addEventListener('click', async event => {
          event.preventDefault(); event.stopPropagation();
          if (!item.entity) { window.history.pushState(null, '', `room-${room.id}`); window.dispatchEvent(new Event('location-changed')); return; }
          if (item.action === 'toggle') {
            try { await this._hass.callService('homeassistant', 'toggle', {}, { entity_id: item.entity }); }
            catch { this._moreInfo(item.entity); }
          } else this._moreInfo(item.entity);
        });
        svg.append(marker);
      }
    });
    card.append(svg);
  }
}

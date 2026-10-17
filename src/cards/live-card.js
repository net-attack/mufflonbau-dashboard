import { liveStyles } from '../design/live-styles.js';
import { localized, resolveLanguage, translations } from '../core/i18n.js';
import { appearanceMode, isOffline, monitorGroups, monitorWarnings, numericState, stateProblem } from '../core/state.js';

import { element, svgElement, icon, iconPath, navigateLink, roomIcon } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { renderInteractiveFloorplan } from './floorplan.js';
import { cleaningActivity, cleaningEntities } from '../core/cleaning.js';
export class MufflonbauLiveCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  setConfig(config) {
    if (!['header', 'climate', 'room-summary', 'floorplan', 'warnings', 'people', 'presence-summary', 'devices', 'cleaning', 'message'].includes(config.mode)) throw new Error('Mufflonbau: unsupported live card mode.');
    this._config = config;
    this._watched = [...new Set([
      config.weather, ...(config.calendars ?? []), ...(config.entities ?? []), ...(config.people ?? []),
      ...(config.objects ?? []).map(item => item.entity),
      ...cleaningEntities(config.cleaning), ...(config.monitors ?? []).map(item => item.entity),
      ...(config.rooms ?? []).flatMap(room => [room.temperature, room.humidity, room.dew_point, ...(room.lights ?? []), ...(room.objects ?? []).map(item => item.entity)]),
      'sun.sun',
    ].filter(Boolean))];
    this._render();
    this._startClock();
  }
  set hass(hass) {
    const previous = this._hass;
    this._hass = hass;
    if (!previous || previous.locale !== hass.locale || previous.language !== hass.language ||
      previous.themes !== hass.themes ||
      (this._config?.mode === 'warnings' && (previous.entities !== hass.entities || previous.devices !== hass.devices)) ||
      this._watched?.some(id => previous.states[id] !== hass.states[id])) this._render();
  }
  getCardSize() { return this._config?.mode === 'floorplan' ? 7 : 3; }
  connectedCallback() { this._startClock(); this._render(); }
  disconnectedCallback() { clearInterval(this._timer); this._timer = undefined; this._mapGestures?.destroy(); }
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
    this._mapGestures?.destroy();
    const language = resolveLanguage(this._config, this._hass);
    this._language = language;
    const text = translations[language];
    const focusedEntity = this.shadowRoot.activeElement?.dataset?.entity;
    const focusedRoom = this.shadowRoot.activeElement?.getAttribute('data-room');
    const focusedMarker = this.shadowRoot.activeElement?.getAttribute('data-marker');
    const style = element('style', liveStyles);
    const card = element('ha-card');
    const mode = appearanceMode(this._config.appearance, this._hass.states, this._hass.themes?.darkMode);
    card.className = `${mode}${this._config.compact ? ' compact' : ''}`;
    applyTheme(card, mode, this._config.appearance?.theme);
    if (this._config.mode === 'header') this._header(card, text);
    if (this._config.mode === 'climate') this._climate(card, text);
    if (this._config.mode === 'room-summary') this._roomSummary(card, text);
    if (this._config.mode === 'warnings') this._warnings(card, text);
    if (this._config.mode === 'floorplan') this._floorplan(card, text);
    if (this._config.mode === 'people') this._people(card, text);
    if (this._config.mode === 'presence-summary') this._presenceSummary(card, text);
    if (this._config.mode === 'devices') this._devices(card, text);
    if (this._config.mode === 'cleaning') this._cleaning(card, text);
    if (this._config.mode === 'message') card.append(element('p', this._config.content, 'message'));
    this.shadowRoot.replaceChildren(style, card);
    if (focusedEntity) [...this.shadowRoot.querySelectorAll('button')].find(button => button.dataset.entity === focusedEntity)?.focus();
    if (focusedRoom) [...this.shadowRoot.querySelectorAll('a')].find(link => link.getAttribute('data-room') === focusedRoom)?.focus();
    if (focusedMarker) [...this.shadowRoot.querySelectorAll('[data-marker]')].find(link => link.getAttribute('data-marker') === focusedMarker)?.focus();
  }
  _section(card, title, label) {
    const head = element('div', undefined, 'section-head');
    head.append(element('h2', title));
    if (label !== undefined) head.append(element('span', String(label), 'eyebrow'));
    card.append(head);
  }
  _greeting(text, hour, now, timezone) {
    const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const options = Array.isArray(text.greetings) ? text.greetings : text.greetings?.[period] ?? [text[period]];
    const day = new Intl.DateTimeFormat('en-CA', { dateStyle: 'short', timeZone: timezone }).format(now);
    const key = `${this._language}:${day}:${period}`;
    if (this._greetingCache?.key !== key) {
      this._greetingCache = { key, value: options[Math.floor(Math.random() * options.length)] };
    }
    return this._greetingCache.value;
  }
  _header(card, text) {
    if (this._config.appearance?.theme === 'calm') return this._calmHeader(card, text);
    card.classList.add('hero');
    const now = new Date();
    const timezone = this._hass.config?.time_zone;
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: timezone }).format(now));
    const grid = element('div', undefined, 'overview-grid');
    const welcome = element('section', undefined, 'overview-welcome');
    welcome.append(element('h1', this._greeting(text, hour, now, timezone)), element('div', new Intl.DateTimeFormat(this._language, { dateStyle: 'full', timeStyle: 'short', timeZone: timezone }).format(now), 'overview-date'));
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
    const greeting = this._greeting(text, hour, now, this._hass.config?.time_zone);
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
    if (this._config.layout === 'table') return this._climateTable(card, text);
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
  _climateTable(card, text) {
    card.classList.add('climate-board');
    const rooms = this._config.rooms ?? [];
    this._section(card, text.climate, String(rooms.length).padStart(2, '0'));
    const columns = [
      { key: 'temperature', label: text.temperature, unit: '°C' },
      { key: 'humidity', label: text.humidity, unit: '%' },
      ...(rooms.some(room => room.dew_point) ? [{ key: 'dew_point', label: text.dewPoint, unit: '°C' }] : []),
    ];
    const table = element('table', undefined, 'climate-table');
    if (columns.length === 3) table.classList.add('has-dew-point');
    table.lang = this._language;
    table.setAttribute('aria-label', text.indoorClimate);
    const head = element('thead');
    const header = element('tr');
    for (const label of [text.room, ...columns.map(column => column.label)]) {
      const cell = element('th', label); cell.scope = 'col'; header.append(cell);
    }
    head.append(header);
    const body = element('tbody');
    for (const room of rooms) {
      const name = localized(room.name, this._language);
      const row = element('tr');
      const heading = element('th'); heading.scope = 'row';
      const link = element('a', name, 'climate-room'); link.dataset.room = room.id;
      navigateLink(link, `room-${room.id}`); heading.append(link); row.append(heading);
      for (const column of columns) {
        const cell = element('td');
        const id = room[column.key];
        if (id) {
          const reading = element('button', undefined, 'climate-reading'); reading.type = 'button'; reading.dataset.entity = id;
          const value = this._value(id, column.unit);
          reading.setAttribute('aria-label', `${name} · ${column.label}: ${value}`);
          reading.title = value;
          if (numericState(this._hass.states[id]) === null) reading.append(this._statusIcon(value));
          else reading.textContent = value;
          reading.addEventListener('click', () => this._moreInfo(id)); cell.append(reading);
        } else {
          const missing = element('span', '—', 'climate-empty'); missing.setAttribute('aria-label', text.notConfigured); cell.append(missing);
        }
        row.append(cell);
      }
      body.append(row);
    }
    table.append(head, body); card.append(table);
  }
  _summaryLink(card, path, iconName, title, detail, meta) {
    const link = element('a', undefined, 'summary-link'); navigateLink(link, path);
    const disc = element('span', undefined, 'summary-icon'); disc.append(icon(iconName));
    const copy = element('span', undefined, 'summary-copy'); copy.append(element('strong', title));
    const info = element('small', undefined, 'summary-detail');
    info.append(element('span', detail));
    if (meta) info.append(element('span', meta, 'summary-meta'));
    copy.append(info);
    link.append(disc, copy, icon('arrow')); card.append(link);
  }
  _roomSummary(card, text) {
    card.classList.add('dashboard-summary');
    const rooms = this._config.rooms ?? [];
    const temperatures = rooms.map(room => numericState(this._hass.states[room.temperature])).filter(value => value !== null);
    const humidities = rooms.map(room => numericState(this._hass.states[room.humidity])).filter(value => value !== null);
    const lights = [...new Set(rooms.flatMap(room => room.lights ?? []))];
    const lightsOn = lights.filter(id => this._hass.states[id]?.state === 'on').length;
    const average = values => values.length ? new Intl.NumberFormat(this._language, { maximumFractionDigits: 1 }).format(values.reduce((sum, value) => sum + value, 0) / values.length) : '–';
    this._summaryLink(card, 'rooms', 'rooms', `${rooms.length} ${text.rooms}`,
      `Ø ${average(temperatures)} °C · Ø ${average(humidities)} %`, `${lightsOn} ${text.lightsOn}`);
  }
  _warnings(card, text) {
    const warnings = monitorWarnings(this._config.monitors ?? [], this._hass.states, this._language, this._hass);
    card.setAttribute('aria-live', 'polite');
    if (this._config.compact) {
      card.classList.add('dashboard-summary');
      this._summaryLink(card, 'system', warnings.length ? 'warning' : 'system', text.system,
        warnings.length ? `${warnings.length} ${warnings.length === 1 ? text.warning : text.warnings} · ${warnings[0].name}: ${warnings[0].detail}` : text.healthy);
      return;
    }
    card.classList.add('system-board');
    this._section(card, text.system, warnings.length ? warnings.length : '✓');
    const summary = element('div', undefined, 'system-summary');
    const total = monitorGroups(this._config.monitors ?? [], this._hass).length;
    for (const [value, label] of [[total, text.monitored], [total - warnings.length, text.healthyDevices], [warnings.length, text.warnings]]) {
      const stat = element('div', undefined, 'system-stat'); stat.append(element('strong', String(value)), element('span', label)); summary.append(stat);
    }
    card.append(summary);
    if (!warnings.length) {
      const healthy = element('div', undefined, 'healthy'); healthy.append(icon('system'), element('span', text.healthy)); card.append(healthy);
    }
    const grid = element('div', undefined, 'warnings-grid');
    for (const warning of warnings) {
      const button = element('button', undefined, 'warning'); button.type = 'button'; button.dataset.entity = warning.entity;
      const disc = element('span', undefined, 'icon-disc'); disc.append(icon('system'));
      const detail = element('span'); detail.append(element('strong', warning.name), element('small', warning.detail));
      if (!warning.device_id && warning.name !== warning.entity) detail.append(element('small', warning.entity, 'entity-id'));
      button.append(disc, detail); button.addEventListener('click', () => this._moreInfo(warning.entity)); grid.append(button);
    }
    card.append(grid);
  }
  _name(id) { return this._hass.states[id]?.attributes?.friendly_name ?? id.split('.').at(-1).replaceAll('_', ' '); }
  _state(id, text) {
    const state = this._hass.states[id];
    if (isOffline(state)) return stateProblem(state, this._language);
    if (text.states[state.state]) return text.states[state.state];
    return this._hass.formatEntityState?.(state) ?? `${state.state}${state.attributes?.unit_of_measurement ? ` ${state.attributes.unit_of_measurement}` : ''}`;
  }
  _people(card, text) {
    card.classList.add('people-board');
    const home = (this._config.people ?? []).filter(id => this._hass.states[id]?.state === 'home').length;
    this._section(card, text.people, `${home} ${text.peopleHome}`);
    const grid = element('div', undefined, 'people-grid');
    for (const id of this._config.people ?? []) {
      const row = element('button', undefined, 'people'); row.type = 'button'; row.dataset.entity = id;
      const name = this._name(id);
      row.addEventListener('click', () => this._moreInfo(id));
      row.append(element('span', name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase(), 'avatar'), element('strong', name),
        element('span', this._state(id, text), `person-state${this._hass.states[id]?.state === 'home' ? ' home' : ''}`));
      const changed = this._hass.states[id]?.last_changed;
      const date = changed && new Date(changed);
      if (date && Number.isFinite(date.getTime())) row.append(element('small', `${text.stateSince}: ${new Intl.DateTimeFormat(this._language, { dateStyle: 'short', timeStyle: 'short', timeZone: this._hass.config?.time_zone }).format(date)}`));
      grid.append(row);
    }
    card.append(grid);
  }
  _presenceSummary(card, text) {
    card.classList.add('dashboard-summary');
    const people = this._config.people ?? [];
    const home = people.filter(id => this._hass.states[id]?.state === 'home');
    const names = home.map(id => this._name(id));
    this._summaryLink(card, 'presence', 'person', `${home.length} ${text.peopleHome}`,
      names.length ? names.join(' · ') : text.nobodyHome);
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
    if (this._config.compact) {
      card.classList.add('dashboard-summary');
      const config = this._config.cleaning;
      const activity = cleaningActivity(this._hass.states[config.entity], this._language);
      const status = [this._state(config.entity, text), activity?.label].filter(Boolean).join(' · ');
      this._summaryLink(card, 'cleaning', 'cleaning', text.cleaning, status,
        config.battery ? `${text.battery} ${this._value(config.battery, '%')}` : undefined);
      return;
    }
    this._section(card, text.cleaning);
    const config = this._config.cleaning; const row = element('div', undefined, 'robot'); const disc = element('span', undefined, 'icon-disc'); disc.append(icon('cleaning'));
    const detail = element('div'); detail.append(element('strong', this._name(config.entity)), element('small', this._state(config.entity, text)));
    if (isOffline(this._hass.states[config.entity])) detail.append(element('small', config.entity, 'entity-id'));
    if (config.battery) detail.append(element('small', `${text.battery} · ${this._value(config.battery, '%')}`));
    row.append(disc, detail); card.append(row); this._link(card, 'cleaning', text.allDetails);
  }
  _floorplan(card, text) {
    if (!this._config.map_only) this._section(card, text.rooms, text.floorplan);
    if (this._config.map_only || this._config.drawing?.length || this._config.objects?.length) { renderInteractiveFloorplan(this, card, text); return; }
    const rooms = this._config.rooms ?? [];
    const positions = rooms.map((room, index) => room.position ?? { x: (index % 3) * 280, y: Math.floor(index / 3) * 180, width: 260, height: 160 });
    const polygons = positions.map(position => position.points ? [position.points] : position.parts ?? [[
      [position.x, position.y], [position.x + position.width, position.y],
      [position.x + position.width, position.y + position.height], [position.x, position.y + position.height],
    ]]);
    const allPoints = [...polygons.flat(2), ...(this._config.walls ?? []).flat()];
    const minX = Math.min(0, ...allPoints.map(point => point[0]));
    const minY = Math.min(0, ...allPoints.map(point => point[1]));
    const width = Math.max(1, ...allPoints.map(point => point[0])) - minX;
    const height = Math.max(1, ...allPoints.map(point => point[1])) - minY;
    const svg = svgElement('svg', { viewBox: `${minX - 6} ${minY - 6} ${width + 12} ${height + 12}`, role: 'group', class: 'floor-map', 'aria-label': text.rooms });
    svg.style.setProperty('--mb-map-ratio', (width + 12) / (height + 12));
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
      const textAnchor = 'middle';
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

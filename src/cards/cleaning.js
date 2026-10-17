import { element, icon } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode, isCleaningActionUnavailable, isOffline, stateProblem } from '../core/state.js';
import { localized, translations } from '../core/i18n.js';

const styles = `
:host{display:block;min-width:0;height:100%;color:var(--mb-ink);font-family:Inter,'Avenir Next',system-ui,sans-serif}*{box-sizing:border-box}
.panel{min-height:100%;padding:18px 20px;background:var(--mb-surface);border:1px solid var(--mb-line);border-radius:24px;backdrop-filter:blur(18px);display:flex;flex-direction:column;gap:14px}
header{display:flex;align-items:center;gap:12px;min-width:0}.robot-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:14px;background:var(--mb-soft);color:var(--mb-accent)}
h2{font-size:18px;margin:0}header small,.meta{font-size:11px;color:var(--mb-muted);line-height:1.5}header .state{margin-left:auto;text-align:right;max-width:40%;overflow-wrap:anywhere}
.actions,.modes{display:flex;gap:8px}.command{flex:1;min-width:0;min-height:44px;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px 10px;background:var(--mb-soft);border:1px solid var(--mb-line);border-radius:14px;color:var(--mb-ink);font:inherit;font-size:12px;cursor:pointer}.command svg{width:18px;height:18px;color:var(--mb-accent)}
.command[aria-pressed=true]{background:var(--mb-active);border-color:var(--mb-accent);color:var(--mb-accent)}.room-copy{min-width:0}.room-copy small{display:block;font-size:10px;color:var(--mb-muted);margin-top:3px}.rooms-label{margin:0}
.mode-note{font-size:11px;color:var(--mb-muted);margin:0;line-height:1.5}.room-copy .entity-id{font-family:ui-monospace,monospace;font-size:9px;overflow-wrap:anywhere}
.rooms{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px;align-content:start;min-height:0}.room{min-height:52px;padding:8px 10px;display:flex;align-items:center;gap:8px;text-align:left;background:var(--mb-soft);border:1px solid var(--mb-line);border-radius:13px;color:var(--mb-ink);font:inherit;cursor:pointer}.room svg{width:18px;height:18px;color:var(--mb-accent);flex:none}.room span{font-size:11px;line-height:1.3;overflow-wrap:anywhere}
button:disabled{opacity:.5;cursor:default}button:focus-visible{outline:2px solid var(--mb-accent);outline-offset:2px}
.feedback{min-height:16px;margin:0;color:var(--mb-muted);font-size:11px}.feedback[role=alert]{color:#a45440}
@media(max-width:900px){.panel{padding:14px;gap:10px}.rooms{gap:6px}.room{min-height:48px;padding:7px}.room span{font-size:10px}}
@media(max-width:560px){.rooms{grid-template-columns:repeat(2,minmax(0,1fr))}.actions .command,.modes .command{font-size:10px}}
`;

const commands = [['start_pause', 'play', 'startPause'], ['stop', 'stop', 'stop'], ['return_home', 'home', 'returnHome']];
const roomCommands = [['vacuum', 'cleaning', 'vacuum'], ['mop', 'drop', 'mop'], ['clean_genius', 'sun', 'cleanGenius']];

export class MufflonbauCleaning extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(config) { this._config = config; this._mode = undefined; this._render(); }
  set hass(value) {
    const previous = this._hass; this._hass = value;
    const ids = [this._config?.cleaning?.entity, this._config?.cleaning?.battery, this._config?.cleaning?.current_room,
      ...(this._config?.rooms ?? []).flatMap(room => Object.values(room.cleaning ?? {}))].filter(Boolean);
    if (!previous || ids.some(id => previous.states[id] !== value.states[id]) || previous.states['sun.sun'] !== value.states['sun.sun'] || previous.themes !== value.themes) this._render();
  }
  getCardSize() { return 5; }
  async _service(domain, service, entity, text) {
    if (this._busy) return;
    const active = this.shadowRoot.activeElement;
    const focus = active?.dataset.room ? `[data-room="${active.dataset.room}"]` : active?.dataset.command ? `[data-command="${active.dataset.command}"]` : undefined;
    this._busy = true; this._error = ''; this._render();
    try { await this._hass.callService(domain, service, {}, { entity_id: entity }); }
    catch { this._error = text.actionFailed; }
    finally { this._busy = false; this._render(); if (focus) this.shadowRoot.querySelector(focus)?.focus(); }
  }
  _moreInfo(id) { this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true })); }
  _render() {
    if (!this._config || !this._hass) return;
    const { cleaning = {}, rooms = [], language = 'en' } = this._config;
    const text = translations[language];
    applyTheme(this, appearanceMode(this._config.appearance, this._hass.states, this._hass.themes?.darkMode), this._config.appearance?.theme);
    const panel = element('section', undefined, 'panel');
    const header = element('header'); const badge = element('span', undefined, 'robot-icon'); badge.append(icon('cleaning'));
    const identity = element('div'); identity.append(element('h2', this._name(cleaning.entity)), element('small', text.cleaning));
    header.append(badge, identity);
    if (cleaning.entity) {
      const state = this._hass.states[cleaning.entity];
      const status = element('span', stateProblem(state, language) ?? text.states[state?.state] ?? state?.state ?? text.missing, 'state');
      header.append(status);
    }
    panel.append(header);
    const meta = element('div', undefined, 'meta');
    const details = [];
    if (cleaning.battery) details.push(`${text.battery}: ${this._display(cleaning.battery, '%')}`);
    if (cleaning.current_room) details.push(`${text.room}: ${this._display(cleaning.current_room)}`);
    meta.textContent = details.join('   ·   '); if (details.length) panel.append(meta);
    const feedback = element('p', this._error ?? '', 'feedback'); feedback.setAttribute('role', this._error ? 'alert' : 'status');
    if (cleaning.entity) {
      const controls = element('div', undefined, 'actions');
      for (const [service, symbol, label] of commands) {
        const button = element('button', undefined, 'command'); button.type = 'button'; button.dataset.command = service;
        button.disabled = this._busy || isOffline(this._hass.states[cleaning.entity]);
        button.append(icon(symbol), element('span', text[label]));
        button.addEventListener('click', () => this._service('vacuum', service, cleaning.entity, text));
        controls.append(button);
      }
      panel.append(controls);
    }
    const actionRooms = rooms.filter(room => Object.keys(room.cleaning ?? {}).length);
    if (actionRooms.length) {
      this._mode ??= roomCommands.find(([kind]) => actionRooms.some(room => room.cleaning?.[kind]))?.[0];
      const modes = element('div', undefined, 'modes'); modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', text.cleaningMode);
      for (const [kind, symbol, label] of roomCommands) {
        const button = element('button', undefined, 'command'); button.type = 'button'; button.dataset.mode = kind;
        button.setAttribute('aria-pressed', String(this._mode === kind));
        button.disabled = this._busy || !actionRooms.some(room => room.cleaning?.[kind]);
        if (button.disabled && !this._busy) button.title = text.notConfigured;
        button.append(icon(symbol), element('span', text[label]));
        button.addEventListener('click', () => { this._mode = kind; this._error = ''; this._render(); this.shadowRoot.querySelector(`[data-mode="${kind}"]`)?.focus(); });
        modes.append(button);
      }
      panel.append(element('p', text.cleaningMode, 'meta rooms-label'), modes, element('p', text.chooseCleaningRoom, 'meta rooms-label'));
      const missingModes = roomCommands.filter(([kind]) => !actionRooms.some(room => room.cleaning?.[kind])).map(([, , label]) => text[label]);
      if (missingModes.length) panel.append(element('p', `${missingModes.join(', ')}: ${text.missingCleaningHelper}`, 'mode-note'));
      const roomGrid = element('div', undefined, 'rooms');
      for (const room of actionRooms) {
        const entity = room.cleaning?.[this._mode];
        const button = element('button', undefined, 'room'); button.type = 'button'; button.dataset.room = room.id;
        const unavailable = !entity || isCleaningActionUnavailable(entity, this._hass.states[entity]);
        button.disabled = this._busy || unavailable;
        const label = roomCommands.find(([kind]) => kind === this._mode)[2];
        const name = localized(room.name, language); button.setAttribute('aria-label', `${name} · ${text[label]}`);
        const copy = element('span', name, 'room-copy'); copy.append(element('small', !entity ? text.notConfigured : unavailable ? stateProblem(this._hass.states[entity], language) : text[label]));
        if (entity && unavailable) {
          button.title = `${stateProblem(this._hass.states[entity], language)}: ${entity}`;
          copy.append(element('small', entity, 'entity-id'));
        }
        button.append(icon('rooms'), copy);
        button.addEventListener('click', () => this._service(entity.startsWith('script.') ? 'script' : 'input_button', entity.startsWith('script.') ? 'turn_on' : 'press', entity, text)); roomGrid.append(button);
      }
      panel.append(roomGrid);
    }
    panel.append(feedback);
    this.shadowRoot.replaceChildren(element('style', styles), panel);
  }
  _name(id) { return id ? this._hass.states[id]?.attributes?.friendly_name ?? id.split('.').at(-1).replaceAll('_', ' ') : translations[this._config.language ?? 'en'].vacuum; }
  _display(id, unit = '') {
    const state = this._hass.states[id]; const text = translations[this._config.language ?? 'en'];
    return stateProblem(state, this._config.language ?? 'en') ?? `${state.state}${state.attributes?.unit_of_measurement ? ` ${state.attributes.unit_of_measurement}` : unit}`;
  }
}

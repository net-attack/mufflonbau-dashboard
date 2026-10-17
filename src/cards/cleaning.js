import { element, icon } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode, isOffline, stateProblem } from '../core/state.js';
import { localized, translations } from '../core/i18n.js';

const styles = `
:host{display:block;min-width:0;height:100%;color:var(--mb-ink);font-family:Inter,'Avenir Next',system-ui,sans-serif}*{box-sizing:border-box}
.panel{height:100%;padding:18px 20px;background:var(--mb-surface);border:1px solid var(--mb-line);border-radius:24px;backdrop-filter:blur(18px);display:flex;flex-direction:column;gap:14px}
header{display:flex;align-items:center;gap:12px;min-width:0}.robot-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:14px;background:var(--mb-soft);color:var(--mb-accent)}
h2{font-size:18px;margin:0}header small,.meta{font-size:11px;color:var(--mb-muted);line-height:1.5}header .state{margin-left:auto;text-align:right;max-width:40%;overflow-wrap:anywhere}
.actions{display:flex;gap:8px}.command{flex:1;min-width:0;min-height:44px;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px 10px;background:var(--mb-soft);border:1px solid var(--mb-line);border-radius:14px;color:var(--mb-ink);font:inherit;font-size:12px;cursor:pointer}.command svg{width:18px;height:18px;color:var(--mb-accent)}
.rooms{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-content:start;min-height:0}.room{min-height:52px;padding:8px 10px;display:flex;align-items:center;gap:8px;text-align:left;background:var(--mb-soft);border:1px solid var(--mb-line);border-radius:13px;color:var(--mb-ink);font:inherit;cursor:pointer}.room svg{width:18px;height:18px;color:var(--mb-accent);flex:none}.room span{font-size:11px;line-height:1.3;overflow-wrap:anywhere}
button:disabled{opacity:.5;cursor:default}button:focus-visible{outline:2px solid var(--mb-accent);outline-offset:2px}
dialog{width:min(380px,calc(100% - 32px));padding:22px;border:1px solid var(--mb-line);border-radius:22px;background:var(--mb-surface);color:var(--mb-ink);box-shadow:0 24px 80px #0005}dialog::backdrop{background:#10182080;backdrop-filter:blur(5px)}dialog h3{margin:0 0 8px;font-size:18px}dialog p{margin:0 0 18px;color:var(--mb-muted);font-size:12px}.dialog-actions{display:grid;gap:8px}.dialog-close{width:100%;min-height:44px;margin-top:12px;background:transparent;border:1px solid var(--mb-line);border-radius:12px;color:var(--mb-muted);font:inherit;cursor:pointer}
.feedback{min-height:16px;margin:0;color:var(--mb-muted);font-size:11px}.feedback[role=alert]{color:#a45440}
@media(max-width:900px){.panel{padding:14px;gap:10px}.rooms{gap:6px}.room{min-height:48px;padding:7px}.room span{font-size:10px}}
@media(max-width:560px){.rooms{grid-template-columns:repeat(2,minmax(0,1fr))}.actions .command{font-size:10px}}
`;

const commands = [['start_pause', 'play', 'startPause'], ['stop', 'stop', 'stop'], ['return_home', 'home', 'returnHome']];
const roomCommands = [['vacuum', 'cleaning', 'vacuum'], ['mop', 'drop', 'mop']];

export class MufflonbauCleaning extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(config) { this._config = config; this._render(); }
  set hass(value) {
    const previous = this._hass; this._hass = value;
    const ids = [this._config?.cleaning?.entity, this._config?.cleaning?.battery, this._config?.cleaning?.current_room].filter(Boolean);
    if (!previous || ids.some(id => previous.states[id] !== value.states[id]) || previous.states['sun.sun'] !== value.states['sun.sun'] || previous.themes !== value.themes) this._render();
  }
  getCardSize() { return 5; }
  async _service(domain, service, entity, button, feedback, text) {
    button.disabled = true; feedback.removeAttribute('role'); feedback.textContent = '';
    try { await this._hass.callService(domain, service, {}, { entity_id: entity }); }
    catch { feedback.setAttribute('role', 'alert'); feedback.textContent = text.actionFailed; }
    finally { button.disabled = false; }
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
    const feedback = element('p', undefined, 'feedback');
    if (cleaning.entity) {
      const controls = element('div', undefined, 'actions');
      for (const [service, symbol, label] of commands) {
        const button = element('button', undefined, 'command'); button.type = 'button';
        button.disabled = isOffline(this._hass.states[cleaning.entity]);
        button.append(icon(symbol), element('span', text[label]));
        button.addEventListener('click', () => this._service('vacuum', service, cleaning.entity, button, feedback, text));
        controls.append(button);
      }
      panel.append(controls);
    }
    const actionRooms = rooms.filter(room => Object.keys(room.cleaning ?? {}).length);
    if (actionRooms.length) {
      panel.append(element('p', text.roomActions, 'meta'));
      const roomGrid = element('div', undefined, 'rooms');
      for (const room of actionRooms) {
        const button = element('button', undefined, 'room'); button.type = 'button';
        button.append(icon('rooms'), element('span', localized(room.name, language)));
        button.addEventListener('click', () => this._openRoom(room, text, feedback)); roomGrid.append(button);
      }
      panel.append(roomGrid);
    }
    panel.append(feedback);
    this.shadowRoot.replaceChildren(element('style', styles), panel);
  }
  _openRoom(room, text, feedback) {
    const dialog = element('dialog');
    const heading = element('h3', localized(room.name, this._config.language ?? 'en'));
    dialog.append(heading, element('p', text.roomActionPrompt));
    const actions = element('div', undefined, 'dialog-actions');
    for (const [kind, symbol, label] of roomCommands) {
      const entity = room.cleaning?.[kind]; if (!entity) continue;
      const button = element('button', undefined, 'command'); button.type = 'button';
      button.append(icon(symbol), element('span', text[label]));
      button.addEventListener('click', async () => {
        await this._service('input_button', 'press', entity, button, feedback, text);
        if (!feedback.hasAttribute('role')) dialog.close();
      });
      actions.append(button);
    }
    const close = element('button', text.close, 'dialog-close'); close.type = 'button'; close.addEventListener('click', () => dialog.close());
    dialog.append(actions, close);
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    this.shadowRoot.append(dialog); dialog.addEventListener('close', () => dialog.remove(), { once: true }); dialog.showModal();
  }
  _name(id) { return id ? this._hass.states[id]?.attributes?.friendly_name ?? id.split('.').at(-1).replaceAll('_', ' ') : translations[this._config.language ?? 'en'].vacuum; }
  _display(id, unit = '') {
    const state = this._hass.states[id]; const text = translations[this._config.language ?? 'en'];
    return stateProblem(state, this._config.language ?? 'en') ?? `${state.state}${state.attributes?.unit_of_measurement ? ` ${state.attributes.unit_of_measurement}` : unit}`;
  }
}

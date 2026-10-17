import { element, icon } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode } from '../core/state.js';
import { resolveLanguage } from '../core/i18n.js';
import { laundryEntities, laundryStatus, laundryText } from '../core/laundry.js';

const styles = `
:host{display:block;min-width:0;color:var(--mb-ink);font-family:Inter,'Avenir Next',system-ui,sans-serif}*{box-sizing:border-box}
.panel{display:block;padding:14px 18px;background:var(--mb-surface);border:1px solid var(--mb-line);border-radius:24px}
button{font:inherit;color:inherit;cursor:pointer}button:focus-visible{outline:2px solid var(--mb-accent);outline-offset:3px}
.open{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;border:0;padding:0;background:none;text-align:left}.open>svg{flex:none;color:var(--mb-accent)}.copy{flex:1;min-width:0}.copy strong,.copy small{display:block}.copy small{font-size:12px;color:var(--mb-muted);line-height:1.6;overflow-wrap:anywhere}.ready{border-color:var(--mb-accent);background:var(--mb-active)}
dialog{width:min(600px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:20px;border:1px solid var(--mb-line);border-radius:24px;background:var(--mb-surface);color:var(--mb-ink);overflow:auto}dialog::backdrop{background:#101c2b88}header{display:flex;align-items:center;gap:12px}h2{font-size:21px;margin:0;flex:1}h3{margin:0;font-size:18px}.close,.ack{min-height:44px;border:1px solid var(--mb-line);border-radius:14px;background:var(--mb-soft);padding:10px 14px}.item{border-top:1px solid var(--mb-line);margin-top:16px;padding-top:16px}.state{font-size:17px;color:var(--mb-accent);margin:8px 0}.meta,.note{font-size:14px;color:var(--mb-muted);line-height:1.6}.ack{background:var(--mb-active);margin-top:10px}.error{color:#ac493b}button:disabled{opacity:.5;cursor:default}
`;

export class MufflonbauLaundry extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(config) { this._config = config; this._watched = laundryEntities(config.laundry); this._render(); }
  set hass(value) {
    const previous = this._hass; this._hass = value;
    if (!previous || previous.locale !== value.locale || previous.language !== value.language || previous.themes !== value.themes || previous.states['sun.sun'] !== value.states['sun.sun'] || this._watched?.some(id => previous.states[id] !== value.states[id])) this._render();
  }
  getCardSize() { return 1; }
  disconnectedCallback() { this.shadowRoot.querySelector('dialog')?.close(); }
  _render() {
    if (!this._hass || !this._config) return;
    const wasOpen = this.shadowRoot.querySelector('dialog')?.open;
    const focused = this.shadowRoot.activeElement?.dataset?.action;
    const language = resolveLanguage(this._config, this._hass), text = laundryText[language];
    const mode = appearanceMode(this._config.appearance, this._hass.states, this._hass.themes?.darkMode);
    applyTheme(this, mode, this._config.appearance?.theme);
    const items = this._config.laundry ?? [];
    const results = items.map(item => laundryStatus(item, this._hass.states, language));
    const panel = element('ha-card', undefined, `panel${results.some(item => item.status === 'finished') ? ' ready' : ''}`);
    const open = element('button', undefined, 'open'); open.type = 'button'; open.dataset.action = 'open'; open.setAttribute('aria-haspopup', 'dialog');
    const copy = element('span', undefined, 'copy'); copy.append(element('strong', text.title), element('small', results.map(item => `${item.name}: ${item.label}`).join(' · ')));
    open.append(icon('drop'), copy, icon('arrow')); panel.append(open);
    const dialog = element('dialog'); dialog.setAttribute('aria-label', text.title);
    const header = element('header'); const close = element('button', text.close, 'close'); close.type = 'button'; close.dataset.action = 'close';
    close.addEventListener('click', () => { dialog.close(); open.focus(); }); header.append(icon('drop'), element('h2', text.title), close); dialog.append(header);
    dialog.append(element('p', text.inferred, 'note'));
    items.forEach((item, index) => {
      const result = results[index]; const section = element('section', undefined, 'item'); section.dataset.appliance = item.id;
      section.append(element('h3', result.name), element('p', result.label, 'state'));
      const reading = result.power === null ? '—' : `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(result.power)} W`;
      section.append(element('div', `${text.power}: ${reading}`, 'meta'));
      const date = new Date(this._hass.states[item.last_finished]?.state);
      if (Number.isFinite(date.getTime()) && date.getFullYear() > 2000) section.append(element('div', `${text.last}: ${new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'short', timeZone: this._hass.config?.time_zone }).format(date)}`, 'meta'));
      if (result.status === 'finished') {
        const ack = element('button', text.acknowledge, 'ack'); ack.type = 'button'; ack.dataset.action = `ack-${item.id}`; ack.disabled = this._busy === item.id;
        ack.addEventListener('click', async () => {
          this._busy = item.id; ack.disabled = true;
          try { await this._hass.callService('input_select', 'select_option', { option: 'idle' }, { entity_id: item.status }); }
          catch { const error = element('p', text.error, 'error'); error.setAttribute('role', 'alert'); section.append(error); }
          finally { this._busy = undefined; ack.disabled = false; }
        }); section.append(ack);
      }
      dialog.append(section);
    });
    open.addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => open.focus());
    this.shadowRoot.replaceChildren(element('style', styles), panel, dialog);
    if (wasOpen) dialog.showModal();
    if (focused) [...this.shadowRoot.querySelectorAll('[data-action]')].find(item => item.dataset.action === focused)?.focus();
  }
}

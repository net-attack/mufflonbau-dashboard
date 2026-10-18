import { element, icon } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode } from '../core/state.js';
import { resolveLanguage } from '../core/i18n.js';
import { laundryEntities, laundryStatus, laundryText } from '../core/laundry.js';

const styles = `
:host{display:block;min-width:0;color:var(--mb-ink);font-family:Inter,'Avenir Next',system-ui,sans-serif}*{box-sizing:border-box}
.panel{display:block;padding:0;background:transparent;border:0;border-radius:16px;box-shadow:none}
button{font:inherit;color:inherit;cursor:pointer}button:focus-visible{outline:2px solid var(--mb-accent);outline-offset:3px}
.open{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;width:100%;min-height:64px;border:1px solid var(--mb-line);border-radius:16px;padding:10px 12px;background:var(--mb-surface);text-align:left}.open>svg{color:var(--mb-accent)}.summary-icon{width:32px;height:32px;display:grid;place-items:center;color:var(--mb-accent);background:var(--mb-active);border-radius:10px}.summary-icon svg{width:19px;height:19px}.copy{min-width:0}.copy strong,.copy small{display:block}.copy strong{font-size:13px;line-height:1.4}.copy small{margin-top:2px;font-size:10px;color:var(--mb-muted);line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ready .open{border-color:var(--mb-accent);background:var(--mb-active)}
dialog{width:min(600px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:20px;border:1px solid var(--mb-line);border-radius:24px;background:var(--mb-surface);color:var(--mb-ink);overflow:auto}dialog::backdrop{background:#101c2b88}header{display:flex;align-items:center;gap:12px}h2{font-size:21px;margin:0;flex:1}h3{margin:0;font-size:18px}.close,.ack{min-height:44px;border:1px solid var(--mb-line);border-radius:14px;background:var(--mb-soft);padding:10px 14px}.item{border-top:1px solid var(--mb-line);margin-top:16px;padding-top:16px}.state{font-size:17px;color:var(--mb-accent);margin:8px 0}.meta,.note{font-size:14px;color:var(--mb-muted);line-height:1.6}.ack{background:var(--mb-active);margin-top:10px}.error{color:#ac493b}button:disabled{opacity:.5;cursor:default}
`;

export class MufflonbauLaundry extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._busy = new Set(); this._errors = new Set(); }
  setConfig(config) { this._config = config; this._watched = laundryEntities(config.laundry); this._render(); }
  set hass(value) {
    const previous = this._hass; this._hass = value;
    if (!previous || previous.locale !== value.locale || previous.language !== value.language || previous.themes !== value.themes || previous.states['sun.sun'] !== value.states['sun.sun'] || this._watched?.some(id => previous.states[id] !== value.states[id])) this._render();
  }
  getCardSize() { return 1; }
  disconnectedCallback() { this.shadowRoot.querySelector('dialog')?.close(); }
  async _acknowledge(item, result) {
    if (this._busy.has(item.id)) return;
    this._busy.add(item.id); this._errors.delete(item.id); this._render();
    try {
      if (item.acknowledged) {
        await this._hass.callService('input_datetime', 'set_datetime', { timestamp: result.finished }, { entity_id: item.acknowledged });
      } else {
        await this._hass.callService('input_select', 'select_option', { option: 'idle' }, { entity_id: item.status });
      }
    } catch { this._errors.add(item.id); }
    finally { this._busy.delete(item.id); this._render(); }
  }
  _render() {
    if (!this._hass || !this._config) return;
    const wasOpen = this.shadowRoot.querySelector('dialog')?.open;
    const focused = this.shadowRoot.activeElement?.dataset?.action;
    const language = resolveLanguage(this._config, this._hass), text = laundryText[language];
    const mode = appearanceMode(this._config.appearance, this._hass.states, this._hass.themes?.darkMode);
    applyTheme(this, mode, this._config.appearance?.theme);
    const items = this._config.laundry ?? [];
    const results = items.map(item => laundryStatus(item, this._hass.states, language));
    const panel = element('ha-card', undefined, `panel${results.some(item => item.pending) ? ' ready' : ''}`);
    const open = element('button', undefined, 'open'); open.type = 'button'; open.dataset.action = 'open'; open.setAttribute('aria-haspopup', 'dialog');
    const description = results.map(item => `${item.name}: ${item.label}${item.pending && item.status !== 'finished' ? ` · ${text.pending}` : ''}`).join(' · ');
    const copy = element('span', undefined, 'copy'); const detail = element('small', description); detail.title = description;
    copy.append(element('strong', text.title), detail);
    const badge = element('span', undefined, 'summary-icon'); badge.append(icon('drop'));
    open.setAttribute('aria-label', `${text.title}: ${description}`);
    open.append(badge, copy, icon('arrow')); panel.append(open);
    const dialog = element('dialog'); dialog.setAttribute('aria-label', text.title);
    const header = element('header'); const close = element('button', text.close, 'close'); close.type = 'button'; close.dataset.action = 'close';
    close.addEventListener('click', () => { dialog.close(); open.focus(); }); header.append(icon('drop'), element('h2', text.title), close); dialog.append(header);
    dialog.append(element('p', text.inferred, 'note'));
    items.forEach((item, index) => {
      const result = results[index]; const section = element('section', undefined, 'item'); section.dataset.appliance = item.id;
      section.append(element('h3', result.name), element('p', result.label, 'state'));
      const reading = result.power === null ? '—' : `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(result.power)} W`;
      section.append(element('div', `${text.power}: ${reading}`, 'meta'));
      const date = result.finished === null ? new Date(NaN) : new Date(result.finished * 1000);
      if (Number.isFinite(date.getTime()) && date.getFullYear() > 2000) section.append(element('div', `${text.last}: ${new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'short', timeZone: this._hass.config?.time_zone }).format(date)}`, 'meta'));
      if (result.pending) {
        const pending = element('p', `${result.status === 'finished' ? '' : `${text.pending}. `}${text.confirm}`, 'note pending'); pending.setAttribute('role', 'status'); section.append(pending);
        const ack = element('button', text.acknowledge, 'ack'); ack.type = 'button'; ack.dataset.action = `ack-${item.id}`;
        ack.disabled = this._busy.has(item.id) || Boolean(item.acknowledged && (result.finished === null || !this._hass.states[item.acknowledged] || ['unknown', 'unavailable'].includes(this._hass.states[item.acknowledged].state)));
        ack.addEventListener('click', () => this._acknowledge(item, result)); section.append(ack);
        if (this._errors.has(item.id)) { const error = element('p', text.error, 'error'); error.setAttribute('role', 'alert'); section.append(error); }
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

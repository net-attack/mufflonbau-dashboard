import { element, icon, navigateLink } from '../design/dom.js';
import { appearanceMode } from '../core/state.js';
import { applyTheme } from '../design/tokens.js';
import { shoppingStatus } from '../core/shopping.js';

const styles = `
:host{display:block;min-width:0;font-family:Inter,'Avenir Next',system-ui,sans-serif;color:var(--mb-ink)}*{box-sizing:border-box}
.panel{padding:16px 20px;border:1px solid var(--mb-line);border-radius:24px;background:var(--mb-surface);backdrop-filter:blur(18px)}
a{display:flex;align-items:center;gap:12px;color:inherit;text-decoration:none;min-height:44px}a>svg:first-child{color:var(--mb-accent);flex:none}a>svg:last-child{margin-left:auto;flex:none}strong{display:block;font-size:16px}small{display:block;color:var(--mb-muted);font-size:12px;line-height:1.5;overflow-wrap:anywhere}
form{display:flex;gap:8px;margin-top:12px}input{flex:1;min-width:0}input,button{min-height:44px;border:1px solid var(--mb-line);border-radius:13px;background:var(--mb-soft);color:var(--mb-ink);font:inherit;padding:10px 12px;font-size:15px}button{cursor:pointer;font-weight:600}button:disabled,input:disabled{opacity:.55;cursor:default}input:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid var(--mb-accent);outline-offset:3px}.feedback{margin:8px 0 0;font-size:13px;line-height:1.5;overflow-wrap:anywhere}.feedback:empty{display:none}[role=alert]{color:var(--mb-ink)}
`;

export class MufflonbauShopping extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._draft = ''; }
  setConfig(config) {
    if (this._config?.shopping?.entity !== config.shopping.entity) { this._draft = ''; this._message = ''; }
    this._config = config; this._render();
  }
  set hass(value) {
    const old = this._hass; this._hass = value;
    if (!old || old.states[this._config?.shopping?.entity] !== value.states[this._config?.shopping?.entity] ||
      old.states['sun.sun'] !== value.states['sun.sun'] || old.themes !== value.themes || old.services !== value.services) this._render();
  }
  getCardSize() { return 2; }
  _render() {
    if (!this._config || !this._hass) return;
    const { shopping, language = 'en' } = this._config;
    const de = language === 'de';
    const status = shoppingStatus(shopping, this._hass, language);
    const focused = this.shadowRoot.activeElement?.tagName === 'INPUT';
    const position = this.shadowRoot.activeElement?.selectionStart;
    applyTheme(this, appearanceMode(this._config.appearance, this._hass.states, this._hass.themes?.darkMode), this._config.appearance?.theme);
    const panel = element('section', undefined, 'panel');
    const link = element('a'); navigateLink(link, 'shopping');
    const copy = element('span'); copy.append(element('strong', shopping.name ?? (de ? 'Einkaufsliste' : 'Shopping list')),
      element('small', status.problem ?? `${status.count} ${de ? status.count === 1 ? 'offener Eintrag' : 'offene Einträge' : status.count === 1 ? 'item to buy' : 'items to buy'}`));
    link.append(icon('shopping'), copy, icon('arrow')); panel.append(link);
    const form = element('form'); form.setAttribute('aria-label', de ? 'Artikel zur Einkaufsliste hinzufügen' : 'Add to shopping list');
    const input = element('input'); input.type = 'text'; input.name = 'item'; input.autocomplete = 'off';
    input.placeholder = de ? 'Was fehlt?' : 'What do we need?'; input.setAttribute('aria-label', de ? 'Neuer Artikel' : 'New item');
    input.value = this._draft; input.disabled = this._busy || !status.canAdd;
    const button = element('button', this._busy ? (de ? 'Wird hinzugefügt…' : 'Adding…') : (de ? 'Hinzufügen' : 'Add')); button.type = 'submit';
    button.disabled = this._busy || !status.canAdd || !this._draft.trim();
    input.addEventListener('input', () => { this._draft = input.value; button.disabled = this._busy || !status.canAdd || !this._draft.trim(); });
    form.addEventListener('submit', event => { event.preventDefault(); this._submit(); });
    form.append(input, button); panel.append(form);
    if (!status.problem && !status.canAdd) panel.append(element('small', de ? 'Diese Liste unterstützt das Hinzufügen derzeit nicht.' : 'Adding is not currently supported for this list.'));
    const feedback = element('p', this._message ?? '', 'feedback'); feedback.setAttribute('role', this._error ? 'alert' : 'status'); panel.append(feedback);
    this.shadowRoot.replaceChildren(element('style', styles), panel);
    if (focused && !input.disabled) { input.focus(); if (position !== undefined) input.setSelectionRange(position, position); }
  }
  async _submit() {
    if (this._busy || !this._draft.trim() || !shoppingStatus(this._config.shopping, this._hass, this._config.language).canAdd) return;
    const entity = this._config.shopping.entity;
    const item = this._draft.trim(); const de = this._config.language === 'de';
    this._busy = true; this._error = false; this._message = ''; this._render();
    try {
      await this._hass.callService('todo', 'add_item', { item }, { entity_id: entity });
      if (this._config.shopping.entity === entity) { this._draft = ''; this._message = de ? 'Hinzugefügt. Die Liste wird über die Integration aktualisiert.' : 'Added. The integration will refresh the list.'; }
    } catch {
      this._error = true; this._message = de ? 'Hinzufügen fehlgeschlagen. Dein Text bleibt erhalten; bitte erneut versuchen.' : 'Could not add the item. Your text is preserved; please try again.';
    } finally { this._busy = false; this._render(); this.shadowRoot.querySelector('input')?.focus(); }
  }
}

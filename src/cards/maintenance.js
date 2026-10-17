import { element, icon } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { applyFlusenfelsTheme } from '../design/flusenfels.js';
import { appearanceMode } from '../core/state.js';
import { localized } from '../core/i18n.js';
import { maintenanceEntities, maintenanceStatus, maintenanceText } from '../core/maintenance.js';

const styles = `
:host{display:block;min-width:0;color:var(--mb-ink);font-family:Inter,'Avenir Next',system-ui,sans-serif}*{box-sizing:border-box}
.workshop{padding:20px;border:1px solid var(--mb-line);border-radius:24px;background:var(--mb-surface)}
header{display:flex;align-items:center;gap:12px;margin-bottom:16px}header>svg{flex:none;color:var(--mb-accent)}h2{margin:0;font-size:20px}.royal h2{font-family:Georgia,serif;font-weight:500}
header p,.note,.meta{font-size:12px;color:var(--mb-muted);line-height:1.5;margin:5px 0 0}.summary{font-size:14px;margin:0 0 14px;font-weight:600;line-height:1.5}
.items{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:10px}.item{padding:14px;border:1px solid var(--mb-line);border-radius:16px;background:var(--mb-soft);min-width:0}
.item[data-status=due],.item[data-status=soon]{border-color:var(--mb-accent);background:var(--mb-active)}.item h3{font-size:16px;margin:0;overflow-wrap:anywhere}.badge{display:flex;align-items:center;gap:6px;font-size:12px;margin:8px 0;color:var(--mb-muted)}.badge svg{width:16px;height:16px}
.reading{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:44px;padding:8px 0;border:0;background:transparent;font:inherit;font-size:13px;color:var(--mb-ink);cursor:pointer;text-align:left}.reading span{min-width:0}.reading strong{text-align:right;overflow-wrap:anywhere}.reading:focus-visible{outline:2px solid var(--mb-accent);outline-offset:2px;border-radius:6px}
progress{display:block;width:100%;height:7px;accent-color:var(--mb-accent);margin:4px 0 8px}.note{margin-top:16px}.entity-id{display:block;font-size:10px;overflow-wrap:anywhere;color:var(--mb-muted)}
.reading.problem{display:grid;grid-template-columns:1fr;gap:5px}.reading.problem strong{text-align:left;font-weight:500}
@media(max-width:560px){.workshop{padding:16px}.items{grid-template-columns:1fr}}
`;

export class MufflonbauMaintenance extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(config) { this._config = config; this._render(); }
  set hass(hass) {
    const previous = this._hass; this._hass = hass;
    if (!previous || maintenanceEntities(this._config?.cleaning?.maintenance).some(id => previous.states[id] !== hass.states[id]) ||
      previous.states['sun.sun'] !== hass.states['sun.sun'] || previous.themes !== hass.themes) this._render();
  }
  getCardSize() { return 4; }
  _render() {
    if (!this._hass || !this._config) return;
    const { cleaning = {}, language = 'en', appearance } = this._config;
    const text = maintenanceText[language];
    const mode = appearanceMode(appearance, this._hass.states, this._hass.themes?.darkMode);
    applyTheme(this, mode, appearance?.theme);
    const royal = cleaning.theme === 'flusenfels';
    if (royal) applyFlusenfelsTheme(this, mode);
    const section = element('section', undefined, `workshop${royal ? ' royal' : ''}`);
    const header = element('header'); const copy = element('div');
    copy.append(element('h2', royal ? text.royalTitle : text.title), element('p', text.subtitle));
    header.append(icon('system'), copy); section.append(header);
    const entries = (cleaning.maintenance ?? []).map(item => ({ item, ...maintenanceStatus(item, this._hass.states, language) }));
    const attention = entries.filter(entry => ['due', 'soon'].includes(entry.status));
    const unknown = entries.filter(entry => entry.incomplete);
    const summary = element('p', [attention.length ? `${text.attention}: ${attention.map(entry => localized(entry.item.name, language)).join(', ')}` : unknown.length ? '' : text.healthy,
      unknown.length ? `${text.unknown}: ${unknown.map(entry => localized(entry.item.name, language)).join(', ')}` : ''].filter(Boolean).join(' · '), 'summary');
    summary.setAttribute('role', 'status'); section.append(summary);
    const items = element('div', undefined, 'items');
    const order = { due: 0, soon: 1, unknown: 2, okay: 3 };
    for (const entry of [...entries].sort((a, b) => order[a.status] - order[b.status])) {
      const item = element('article', undefined, 'item'); item.dataset.status = entry.status;
      item.append(element('h3', localized(entry.item.name, language)));
      const badge = element('div', undefined, 'badge');
      badge.append(icon(['due', 'soon', 'unknown'].includes(entry.status) ? 'warning' : 'system'), element('span', text[entry.status])); item.append(badge);
      for (const [kind, reading] of [['percent', entry.percent], ['remaining', entry.remaining]]) {
        if (!reading) continue;
        const button = element('button', undefined, 'reading'); button.type = 'button'; button.dataset.entity = reading.entity;
        if (reading.problem) button.classList.add('problem');
        const label = element('span', text[kind]);
        if (reading.problem) label.append(element('small', reading.entity, 'entity-id'));
        button.append(label, element('strong', reading.problem ?? reading.display));
        button.setAttribute('aria-label', `${localized(entry.item.name, language)} · ${text[kind]} · ${reading.problem ?? reading.display}`);
        button.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: reading.entity }, bubbles: true, composed: true })));
        item.append(button);
        if (kind === 'percent' && !reading.problem) {
          const bar = element('progress'); bar.max = 100; bar.value = reading.value;
          bar.setAttribute('aria-label', `${localized(entry.item.name, language)} · ${text.percent}`); item.append(bar);
        }
      }
      if (!entry.percent) item.append(element('p', text.noPercent, 'meta'));
      items.append(item);
    }
    section.append(items, element('p', text.note, 'note'));
    this.shadowRoot.replaceChildren(element('style', styles), section);
  }
}

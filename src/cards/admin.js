import { element, navigateLink } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode, stateProblem } from '../core/state.js';
import { translations } from '../core/i18n.js';
import { adminGroups, clientSummary } from '../core/admin.js';
const styles = `
:host{display:block;min-width:0;color:var(--mb-ink)}*{box-sizing:border-box}
.panel{padding:24px;background:var(--mb-surface);border:1px solid var(--mb-line);border-radius:24px;backdrop-filter:blur(20px)}
p,small{color:var(--mb-muted);line-height:1.6}h2{font-size:22px;margin:0 0 10px}h3{font-size:17px;margin:0}a,button{font:inherit;color:inherit}
.groups,.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:20px}
.metrics{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.group,.metric{min-width:0;background:var(--mb-soft);border:1px solid var(--mb-line);border-radius:18px;padding:20px;text-decoration:none;overflow-wrap:anywhere}
.group{display:flex;flex-direction:column;gap:12px;min-height:150px}.group span{font-size:13px;color:var(--mb-muted)}
button.metric{cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:10px}.value{font-size:28px;font-weight:650;letter-spacing:-1px}.label{font-size:13px;color:var(--mb-muted)}
small{font-size:11px}.problem .value{font-size:15px;letter-spacing:0}.client-list{display:grid;gap:8px;margin-top:16px}.client{display:flex;justify-content:space-between;gap:12px;text-align:left;min-height:48px;padding:14px;border:1px solid var(--mb-line);border-radius:14px;background:var(--mb-soft)}
a:focus-visible,button:focus-visible{outline:2px solid var(--mb-accent);outline-offset:3px}a:hover,button:hover{border-color:var(--mb-accent)}.back{display:inline-block;margin-bottom:18px;min-height:44px;padding:10px 0;color:var(--mb-accent)}
@media(max-width:950px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.groups,.metrics{grid-template-columns:1fr}.panel{padding:18px}}
`;
export class MufflonbauAdmin extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(config) { this._config = config; this._render(); }
  set hass(value) {
    const previous = this._hass; this._hass = value;
    const ids = Object.values(this._config?.admin ?? {}).flat();
    if (!previous || previous.themes !== value.themes || previous.states['sun.sun'] !== value.states['sun.sun'] || ids.some(id => previous.states[id] !== value.states[id])) this._render();
  }
  getCardSize() { return 6; }
  _info(id) { this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true })); }
  _render() {
    if (!this._config || !this._hass) return;
    const { language = 'en', admin, section } = this._config;
    const text = translations[language]; const states = this._hass.states;
    applyTheme(this, appearanceMode(this._config.appearance, states, this._hass.themes?.darkMode), this._config.appearance?.theme);
    const panel = element('div', undefined, 'panel');
    if (section === 'overview') {
      panel.append(element('h2', text.admin), element('p', text.adminIntro));
      const groups = element('div', undefined, 'groups');
      for (const group of adminGroups) {
        const link = element('a', undefined, 'group'); navigateLink(link, `admin-${group}`);
        link.append(element('h3', text[group]));
        const ids = admin[group];
        for (const id of ids.slice(0, 2)) {
          const state = states[id];
          link.append(element('span', `${state?.attributes?.friendly_name ?? id}: ${this._display(state, text, language)}`));
        }
        if (!ids.length) link.append(element('span', text[`${group}Setup`]));
        link.append(element('span', `${text.allDetails} →`)); groups.append(link);
      }
      panel.append(groups);
      const expert = element('a', text.expert, 'back'); navigateLink(expert, 'expert');
      if (this._config.expert_available) panel.append(expert);
    } else {
      const back = element('a', `← ${text.admin}`, 'back'); navigateLink(back, 'admin'); panel.append(back, element('h2', text[section]));
      const ids = admin[section] ?? [];
      if (!ids.length) panel.append(element('p', text[`${section}Setup`]));
      const metrics = element('div', undefined, 'metrics');
      for (const id of ids) {
        const state = states[id]; const metric = element('button', undefined, `metric${stateProblem(state, language) ? ' problem' : ''}`);
        metric.type = 'button'; metric.dataset.entity = id;
        metric.append(element('span', state?.attributes?.friendly_name ?? id, 'label'), element('span', this._display(state, text, language), 'value'));
        const time = new Date(state?.last_updated);
        if (Number.isFinite(time.getTime())) {
          const updated = element('time', `${text.measured}: ${time.toLocaleString(language)}`); updated.dateTime = time.toISOString(); metric.append(element('small', undefined)); metric.lastChild.append(updated);
        }
        metric.addEventListener('click', () => this._info(id)); metrics.append(metric);
      }
      panel.append(metrics);
      if (section === 'network') {
        const summary = clientSummary(admin.clients, states);
        panel.append(element('h3', `${text.clients} · ${summary.connected}/${summary.total}`), element('p', text.clientNote));
        const list = element('div', undefined, 'client-list');
        for (const id of admin.clients) {
          const state = states[id]; const row = element('button', undefined, 'client'); row.type = 'button'; row.dataset.entity = id;
          const identity = element('span', state?.attributes?.friendly_name ?? id);
          const attributes = state?.attributes ?? {};
          const details = [attributes.ip, attributes.ip_address, attributes.ssid, attributes.essid, attributes.interface_type].filter(value => typeof value === 'string' && value.trim());
          if (details.length) { identity.append(element('br'), element('small', [...new Set(details)].join(' · '))); }
          row.append(identity, element('span', this._display(state, text, language)));
          row.addEventListener('click', () => this._info(id)); list.append(row);
        }
        panel.append(list);
      }
      if (!ids.length) {
        const setup = element('a', text.setup, 'back'); setup.href = '/config/integrations'; panel.append(setup);
      }
    }
    this.shadowRoot.replaceChildren(element('style', styles), panel);
  }
  _display(state, text, language) {
    return stateProblem(state, language) ?? `${text.states[state.state] ?? state.state}${state.attributes?.unit_of_measurement ? ` ${state.attributes.unit_of_measurement}` : ''}`;
  }
}

import { element, navigateLink } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode, numericState, stateProblem } from '../core/state.js';
import { translations } from '../core/i18n.js';
import { adminGroups, clientSummary, internetRate } from '../core/admin.js';
import { expertCategories } from '../core/expert.js';
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
.expert-panel{min-height:max(320px,calc(100dvh - 230px))}.expert-toolbar{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:18px}.expert-toolbar label{display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--mb-muted);flex:1;min-width:min(240px,100%)}
.expert-toolbar input,.expert-toolbar select{width:100%;min-width:0;min-height:44px;padding:10px 12px;font:inherit;font-size:14px;color:var(--mb-ink);background:var(--mb-soft);border:1px solid var(--mb-line);border-radius:12px}
.expert-toolbar :focus-visible{outline:2px solid var(--mb-accent);outline-offset:3px}.expert-count{margin:0 0 18px;font-size:12px;color:var(--mb-muted)}
.expert-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(330px,100%),1fr));align-items:start;gap:24px}.expert-group{min-width:0}.expert-group h3{margin-bottom:12px}.expert-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:8px}
.expert-entity{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;min-height:64px;padding:12px 14px;border:1px solid var(--mb-line);border-radius:14px;background:var(--mb-soft);text-align:start;cursor:pointer}
.expert-identity{min-width:0;overflow-wrap:anywhere}.expert-identity strong{font-size:13px;display:block}.expert-identity small{display:block;margin-top:4px;font-size:10px}.expert-value{flex:0 1 40%;font-size:14px;text-align:end;overflow-wrap:anywhere}
@media(max-width:950px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.groups,.metrics{grid-template-columns:1fr}.panel{padding:18px}}
`;
export class MufflonbauAdmin extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(config) { this._config = config; this._render(); }
  set hass(value) {
    const previous = this._hass; this._hass = value;
    const ids = [...Object.values(this._config?.admin ?? {}).flat(), ...(this._config?.entities ?? [])];
    if (!previous || previous.themes !== value.themes || previous.states['sun.sun'] !== value.states['sun.sun'] || ids.some(id => previous.states[id] !== value.states[id])) this._render();
  }
  getCardSize() { return 6; }
  _info(id) { this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true })); }
  _render() {
    if (!this._config || !this._hass) return;
    const { language = 'en', admin, section } = this._config;
    const focusedEntity = this.shadowRoot.activeElement?.dataset?.entity;
    const focusedFilter = this.shadowRoot.activeElement?.id;
    const selection = focusedFilter === 'expert-search' ? this.shadowRoot.activeElement.selectionStart : undefined;
    const text = translations[language]; const states = this._hass.states;
    applyTheme(this, appearanceMode(this._config.appearance, states, this._hass.themes?.darkMode), this._config.appearance?.theme);
    const panel = element('div', undefined, 'panel');
    if (section === 'expert') {
      this._expert(panel, text, language);
    } else if (section === 'overview') {
      panel.append(element('h2', text.admin), element('p', text.adminIntro));
      const groups = element('div', undefined, 'groups');
      for (const group of adminGroups) {
        const link = element('a', undefined, 'group'); navigateLink(link, `admin-${group}`);
        link.append(element('h3', text[group]));
        const ids = admin[group];
        for (const id of ids.slice(0, 2)) {
          const state = states[id];
          link.append(element('span', `${state?.attributes?.friendly_name ?? id}: ${this._display(state, text, language, group)}`));
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
        metric.append(element('span', state?.attributes?.friendly_name ?? id, 'label'), element('span', this._display(state, text, language, section), 'value'));
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
    if (focusedEntity) [...this.shadowRoot.querySelectorAll('[data-entity]')].find(node => node.dataset.entity === focusedEntity)?.focus();
    if (focusedFilter) {
      const control = this.shadowRoot.getElementById(focusedFilter); control?.focus();
      if (selection !== undefined) control?.setSelectionRange(selection, selection);
    }
  }
  _expert(panel, text, language) {
    panel.classList.add('expert-panel');
    const toolbar = element('div', undefined, 'expert-toolbar');
    const searchLabel = element('label', text.searchEntities); searchLabel.htmlFor = 'expert-search';
    const search = element('input'); search.id = 'expert-search'; search.type = 'search'; search.value = this._query ?? '';
    search.addEventListener('input', () => { this._query = search.value; this._expertResults(text, language); });
    searchLabel.append(search);
    const filterLabel = element('label', text.category); filterLabel.htmlFor = 'expert-category';
    const filter = element('select'); filter.id = 'expert-category';
    const available = new Set((this._config.entries ?? []).map(entry => entry.category));
    for (const category of ['all', ...expertCategories.filter(key => available.has(key))]) {
      const option = element('option', category === 'all' ? text.allCategories : text[category]); option.value = category; filter.append(option);
    }
    filter.value = this._category ?? 'all';
    filter.addEventListener('change', () => { this._category = filter.value; this._expertResults(text, language); }); filterLabel.append(filter);
    toolbar.append(searchLabel, filterLabel);
    this._expertCount = element('p', undefined, 'expert-count'); this._expertCount.setAttribute('role', 'status');
    this._expertGroups = element('div', undefined, 'expert-groups');
    panel.append(toolbar, this._expertCount, this._expertGroups); this._expertResults(text, language);
  }
  _expertResults(text, language) {
    const states = this._hass.states;
    const entries = [...new Map((this._config.entries ?? []).map(entry => [entry.entity, entry])).values()];
    const query = (this._query ?? '').trim().toLocaleLowerCase(language);
    const filtered = entries.filter(({ entity, category }) => (!this._category || this._category === 'all' || category === this._category) &&
      `${entity} ${states[entity]?.attributes?.friendly_name ?? ''} ${text[category]}`.toLocaleLowerCase(language).includes(query));
    this._expertCount.textContent = filtered.length ? `${filtered.length} / ${entries.length}` : text.noMatchingEntities;
    this._expertGroups.replaceChildren();
    for (const category of expertCategories) {
      const members = filtered.filter(entry => entry.category === category);
      if (!members.length) continue;
      members.sort((a, b) => (states[a.entity]?.attributes?.friendly_name ?? a.entity).localeCompare(states[b.entity]?.attributes?.friendly_name ?? b.entity, language));
      const section = element('section', undefined, 'expert-group'); section.dataset.category = category;
      section.append(element('h3', `${text[category]} · ${members.length}`));
      const list = element('div', undefined, 'expert-list');
      for (const { entity } of members) {
        const state = states[entity]; const row = element('button', undefined, 'expert-entity'); row.type = 'button'; row.dataset.entity = entity;
        const identity = element('span', undefined, 'expert-identity');
        identity.append(element('strong', state?.attributes?.friendly_name ?? entity), element('small', entity));
        row.append(identity, element('span', this._display(state, text, language, category), 'expert-value'));
        row.addEventListener('click', () => this._info(entity)); list.append(row);
      }
      section.append(list); this._expertGroups.append(section);
    }
  }
  _display(state, text, language, section) {
    const rate = section === 'internet' ? internetRate(state?.attributes?.unit_of_measurement) : null;
    const number = numericState(state);
    if (rate && number !== null) return `${new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(number * rate.factor)} ${rate.unit}`;
    return stateProblem(state, language) ?? `${text.states[state.state] ?? state.state}${state.attributes?.unit_of_measurement ? ` ${state.attributes.unit_of_measurement}` : ''}`;
  }
}

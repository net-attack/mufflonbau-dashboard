import { element, icon } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode } from '../core/state.js';
import { fetchHistory } from '../core/history.js';
import { presenceDays, presenceStats, presenceDuration } from '../core/presence.js';

const copy = {
  de: { home: 'Zuhause', away: 'Unterwegs', unknown: 'Status unbekannt', today: 'Zuhause heute', trips: 'Erfasste Ausflüge · 7 Tage',
    last: 'Zuletzt draußen', current: 'Aktuell', since: 'seit', now: 'Gerade unterwegs', never: 'Nicht erfasst', week: 'Die letzten 7 Tage',
    loading: 'Anwesenheitsverlauf wird geladen …', error: 'Der Verlauf ist gerade nicht verfügbar.', retry: 'Erneut laden',
    coverage: 'Grau: nicht erfasst. Angaben basieren auf dem verfügbaren HA-Verlauf.',
    couch: 'Die Couch kennt deinen Namen.', explorer: 'Frische Luft sammelt sich nicht von allein.', welcome: 'Schön, dass du da bist.',
    outside: 'Die Außenwelt hat Besuch.', neutral: 'Jeder Heimweg zählt.' },
  en: { home: 'Home', away: 'Away', unknown: 'Status unknown', today: 'Home today', trips: 'Recorded outings · 7 days',
    last: 'Last away', current: 'Currently', since: 'since', now: 'Currently away', never: 'Not recorded', week: 'The last 7 days',
    loading: 'Loading presence history …', error: 'History is currently unavailable.', retry: 'Retry',
    coverage: 'Gray: not recorded. Figures use the available HA history.',
    couch: 'The couch knows your name.', explorer: 'Collecting fresh air, one outing at a time.', welcome: 'Good to have you home.',
    outside: 'Out visiting the outside world.', neutral: 'Every homecoming counts.' },
};
const styles = `
:host{display:block;min-width:0;color:var(--mb-ink)}*{box-sizing:border-box}
.people-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr));gap:18px}
.person{min-width:0;border:1px solid var(--mb-line);background:var(--mb-surface);border-radius:22px;padding:20px}
button{font:inherit;color:inherit;cursor:pointer}button:focus-visible{outline:2px solid var(--mb-accent);outline-offset:3px}
.people{width:100%;display:flex;align-items:center;gap:12px;padding:0 0 15px;border:0;border-bottom:1px solid var(--mb-line);background:transparent;text-align:left}
.avatar{width:44px;height:44px;flex:none;border-radius:50%;background:var(--mb-soft);color:var(--mb-accent);display:grid;place-items:center}.avatar svg{width:23px;height:23px}
.identity{min-width:0;flex:1}.identity strong{display:block;font-size:17px;overflow-wrap:anywhere}.status{font-size:12px;color:var(--mb-muted);margin-top:4px;display:block}
.badge{border-radius:10px;background:var(--mb-soft);font-size:11px;padding:7px 9px;flex:none;max-width:42%;overflow-wrap:anywhere}.badge.home{background:var(--mb-active);color:var(--mb-accent)}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:18px 14px;margin:19px 0}.fact{min-width:0}.fact dt{font-size:11px;color:var(--mb-muted);line-height:1.4}.fact dd{margin:5px 0 0;font-size:19px;font-weight:600;line-height:1.3;overflow-wrap:anywhere}.fact.last dd{font-size:14px;padding-top:4px}
h3{font-size:12px;font-weight:500;margin:18px 0 10px}.week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.day{min-width:0}.bar{display:flex;height:7px;overflow:hidden;border-radius:6px;background:var(--mb-line)}.bar span{height:100%}.bar .home{background:var(--mb-accent)}.bar .away{background:#7297b6}.day small{display:block;text-align:center;margin-top:7px;font-size:10px;color:var(--mb-muted)}
.motto{margin:18px 0 0;padding-top:13px;border-top:1px solid var(--mb-line);font-size:12px;color:var(--mb-muted);font-style:italic}.note,.feedback{font-size:11px;color:var(--mb-muted);line-height:1.6;margin:14px 0 0}.legend{display:flex;gap:14px;font-size:10px;color:var(--mb-muted);margin-top:14px}.legend span:before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;background:var(--mb-accent)}.legend .away:before{background:#7297b6}.retry{background:var(--mb-soft);border:1px solid var(--mb-line);border-radius:10px;min-height:44px;padding:8px 12px;margin-top:8px}
@media(max-width:700px){.person{padding:16px}.people-grid{gap:14px}.fact dd{font-size:18px}.fact.last dd{font-size:13px}}
`;

export class MufflonbauPresence extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._request = 0; }
  setConfig(config) {
    this._config = config; this._request++; this._loading = false; this._data = undefined; this._loadedAt = 0;
    this._render(); if (this.isConnected) this._load();
  }
  set hass(value) {
    const previous = this._hass;
    this._hass = value;
    if (!previous || previous.themes !== value.themes || previous.states['sun.sun'] !== value.states['sun.sun'] ||
      previous.states[this._config?.appearance?.night_person] !== value.states[this._config?.appearance?.night_person] ||
      previous.states[this._config?.appearance?.ambient_person] !== value.states[this._config?.appearance?.ambient_person] ||
      (this._config?.people ?? []).some(id => previous.states[id] !== value.states[id])) this._render();
    if (this.isConnected && (!this._loadedAt || Date.now() - this._loadedAt >= 300000)) this._load();
  }
  connectedCallback() {
    this._load(); this._timer = setInterval(() => { this._render(); if (Date.now() - this._loadedAt >= 300000) this._load(); }, 60000);
  }
  disconnectedCallback() { clearInterval(this._timer); this._request++; this._loading = false; }
  getCardSize() { return 5; }
  async _load() {
    if (!this._config || !this._hass || this._loading || !this.isConnected) return;
    this._loading = true; this._error = false; const request = ++this._request;
    const now = Date.now(), zone = this._hass.config?.time_zone ?? 'UTC'; this._render();
    try {
      const data = await fetchHistory(this._hass, this._config.people ?? [], presenceDays(now, zone)[0].start, now);
      if (request === this._request) this._data = data;
    } catch { if (request === this._request) this._error = true; }
    finally {
      if (request === this._request) { this._loading = false; this._loadedAt = Date.now(); this._render(); }
    }
  }
  _render() {
    if (!this._config || !this._hass) return;
    const language = this._config.language === 'de' ? 'de' : 'en', text = copy[language];
    const now = Date.now(), zone = this._hass.config?.time_zone ?? 'UTC';
    applyTheme(this, appearanceMode(this._config.appearance, this._hass.states, this._hass.themes?.darkMode), this._config.appearance?.theme);
    const grid = element('div', undefined, 'people-grid');
    const formatDate = time => new Intl.DateTimeFormat(language, { timeZone: zone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(time);
    for (const id of this._config.people ?? []) {
      const live = this._hass.states[id], rows = this._error ? undefined : this._data?.[id];
      const stats = presenceStats(rows, live, now, zone);
      const historyKnown = Array.isArray(rows) && stats.known > 0;
      const panel = element('article', undefined, 'person');
      const header = element('button', undefined, 'people'); header.type = 'button';
      header.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true })));
      const avatar = element('span', undefined, 'avatar'); avatar.append(icon('person'));
      const identity = element('span', undefined, 'identity'); identity.append(element('strong', live?.attributes?.friendly_name ?? id));
      const status = stats.current === 'away' && live?.state !== 'not_home' ? live.state : text[stats.current];
      identity.append(element('span', stats.current !== 'unknown' && stats.since !== null ? `${text.since} ${formatDate(stats.since)}` : text.unknown, 'status'));
      header.append(avatar, identity, element('span', status, `badge ${stats.current}`)); panel.append(header);
      const facts = element('dl', undefined, 'facts');
      const fact = (label, value, className = '') => { const block = element('div', undefined, `fact ${className}`); block.append(element('dt', label), element('dd', value)); facts.append(block); };
      fact(text.today, historyKnown && stats.today.home + stats.today.away > 0 ? presenceDuration(stats.today.home, language) : '—');
      fact(text.trips, historyKnown ? String(stats.outings) : '—');
      fact(text.current, stats.current !== 'unknown' && stats.since !== null ? presenceDuration(now - stats.since, language) : '—');
      fact(text.last, stats.current === 'away' ? text.now : historyKnown && stats.lastAway !== null ? formatDate(stats.lastAway) : text.never, 'last');
      panel.append(facts, element('h3', text.week));
      const week = element('div', undefined, 'week');
      for (const day of stats.days) {
        const column = element('div', undefined, 'day');
        const label = new Intl.DateTimeFormat(language, { timeZone: zone, weekday: 'short' }).format(day.start);
        const bar = element('div', undefined, 'bar'); bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', `${formatDate(day.start)}: ${text.home} ${historyKnown ? presenceDuration(day.home, language) : '—'}, ${text.away} ${historyKnown ? presenceDuration(day.away, language) : '—'}`);
        for (const kind of ['home', 'away']) { const part = element('span', undefined, kind); part.style.width = `${historyKnown ? day[kind] / (day.end - day.start || 1) * 100 : 0}%`; bar.append(part); }
        column.append(bar, element('small', label)); week.append(column);
      }
      const motto = stats.current === 'home' ? historyKnown && stats.today.home >= 8 * 3600000 ? text.couch : text.welcome
        : stats.current === 'away' ? historyKnown && stats.outings >= 7 ? text.explorer : text.outside : text.neutral;
      panel.append(week, element('p', motto, 'motto')); grid.append(panel);
    }
    const legend = element('div', undefined, 'legend'); legend.append(element('span', text.home, 'home'), element('span', text.away, 'away'));
    const note = element('p', text.coverage, 'note');
    const content = [element('style', styles), grid, legend, note];
    if (this._loading && !this._data) content.push(element('p', text.loading, 'feedback'));
    if (this._error) {
      const message = element('p', text.error, 'feedback'); message.setAttribute('role', 'status');
      const retry = element('button', text.retry, 'retry'); retry.addEventListener('click', () => this._load()); content.push(message, retry);
    }
    this.shadowRoot.replaceChildren(...content);
  }
}

import { element, svgElement } from '../design/dom.js';
import { translations } from '../core/i18n.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode } from '../core/state.js';
import { fetchHistory, historyPoints, historyPath } from '../core/history.js';
import { internetRate } from '../core/admin.js';
const colors = ['#648bc2', '#b18bcd', '#69a797', '#d69a68', '#c57689', '#919864'];
const styles = `:host{display:block;min-width:0;color:var(--mb-ink)}*{box-sizing:border-box}.panel{padding:24px;border-radius:24px;background:var(--mb-surface);border:1px solid var(--mb-line)}header{display:flex;justify-content:space-between;gap:12px;align-items:center}h3{margin:0;font-size:18px}select,button{font:inherit;min-height:44px;background:var(--mb-soft);color:var(--mb-ink);border:1px solid var(--mb-line);border-radius:12px;padding:8px}select:focus-visible,button:focus-visible{outline:2px solid var(--mb-accent)}svg{display:block;width:100%;height:190px;overflow:visible;margin:24px 0 10px}text{fill:var(--mb-muted);font-size:12px}.legend{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--mb-muted)}.key{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}p{color:var(--mb-muted);font-size:13px}.times{display:flex;justify-content:space-between;font-size:11px;color:var(--mb-muted);margin-bottom:20px}`;
export class MufflonbauHistory extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._hours = 24; this._request = 0; }
  setConfig(config) { this._config = config; this._data = undefined; this._loadedAt = 0; this._loading = false; this._request++; if (this.isConnected) this._load(); }
  set hass(value) {
    const previous = this._hass; this._hass = value;
    if (this.isConnected && (!this._loadedAt || Date.now() - this._loadedAt > 300000)) this._load();
    else if (!previous || previous.themes !== value.themes || previous.states['sun.sun'] !== value.states['sun.sun']) this._render();
  }
  connectedCallback() { this._load(); this._timer = setInterval(() => this._load(), 300000); }
  disconnectedCallback() { clearInterval(this._timer); this._request++; this._loading = false; }
  getCardSize() { return 4; }
  async _load() {
    if (!this._hass || !this._config || this._loading || !this.isConnected) return;
    this._loading = true; this._error = false; const request = ++this._request;
    this._end = Date.now(); this._start = this._end - this._hours * 3600000; this._render();
    try {
      const data = await fetchHistory(this._hass, this._config.entities, this._start, this._end);
      if (request !== this._request) return;
      this._data = data; this._loadedAt = Date.now();
    } catch { if (request === this._request) this._error = true; }
    finally { if (request === this._request) { this._loading = false; this._render(); } }
  }
  _render() {
    if (!this._config || !this._hass) return;
    const language = this._config.language ?? 'en'; const text = translations[language];
    applyTheme(this, appearanceMode(this._config.appearance, this._hass.states, this._hass.themes?.darkMode), this._config.appearance?.theme);
    const panel = element('div', undefined, 'panel'); const header = element('header');
    header.append(element('h3', text.history)); const select = element('select'); select.setAttribute('aria-label', text.history);
    for (const hours of [6, 24, 168]) { const option = element('option', hours === 168 ? '7 d' : `${hours} h`); option.value = hours; option.selected = hours === this._hours; select.append(option); }
    select.addEventListener('change', () => { this._hours = Number(select.value); this._request++; this._loading = false; this._data = undefined; this._load(); });
    header.append(select); panel.append(header);
    if (this._error) { panel.append(element('p', text.historyError)); const retry = element('button', text.retry); retry.addEventListener('click', () => this._load()); panel.append(retry); }
    else if (!this._data) panel.append(element('p', text.historyLoading));
    else {
      const series = this._config.entities.map(id => {
        const originalUnit = this._hass.states[id]?.attributes?.unit_of_measurement ?? '';
        const rate = this._config.internet_rate ? internetRate(originalUnit) : null;
        return { id, unit: rate?.unit ?? originalUnit, points: historyPoints(this._data[id], this._start, this._end)
          .map(point => ({ ...point, value: point.value === null ? null : point.value * (rate?.factor ?? 1) })) };
      });
      const values = series.flatMap(item => item.points.filter(point => point.value !== null).map(point => point.value));
      if (!values.length) panel.append(element('p', text.noReadings));
      else {
        // Compute bounds without spreading potentially large Recorder responses into Math.min/max.
        let min = Infinity; let max = -Infinity;
        for (const value of values) { min = Math.min(min, value); max = Math.max(max, value); }
        const padding = (max - min || Math.abs(max) * .05 || 1) * .12; min -= padding; max += padding;
        const svg = svgElement('svg', { viewBox: '-55 -10 765 215', role: 'img', 'aria-label': text.history, preserveAspectRatio: 'none' });
        const unit = series[0].unit;
        for (let index = 0; index < 4; index++) {
          const y = index * 60;
          svg.append(svgElement('line', { x1: 0, x2: 700, y1: y, y2: y, stroke: 'var(--mb-line)', 'stroke-dasharray': '4 6' }),
            svgElement('text', { x: -8, y: y + 4, 'text-anchor': 'end' }, new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(max - index / 3 * (max - min))));
        }
        const legend = element('div', undefined, 'legend');
        for (const [index, item] of series.entries()) {
          const color = colors[index % colors.length];
          svg.append(svgElement('path', { d: historyPath(item.points, this._start, this._end, min, max), fill: 'none', stroke: color, 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke' }));
          for (const [pointIndex, point] of item.points.entries()) {
            if (pointIndex % Math.max(1, Math.ceil(item.points.length / 120)) !== 0) continue;
            if (point.value === null) continue;
            const dot = svgElement('circle', { cx: (point.time - this._start) / (this._end - this._start) * 700, cy: 180 - (point.value - min) / (max - min) * 180, r: 2.5, fill: color });
            dot.append(svgElement('title', {}, `${new Date(point.time).toLocaleString(language)}: ${point.value} ${unit}`)); svg.append(dot);
          }
          const label = element('span'); const key = element('span', undefined, 'key'); key.style.background = color;
          label.append(key, document.createTextNode(this._hass.states[item.id]?.attributes?.friendly_name ?? item.id)); legend.append(label);
        }
        const times = element('div', undefined, 'times');
        const format = time => new Date(time).toLocaleString(language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        times.append(element('span', format(this._start)), element('span', unit), element('span', format(this._end)));
        panel.append(svg, times, legend);
      }
    }
    this.shadowRoot.replaceChildren(element('style', styles), panel);
  }
}

import { element, icon, navigateLink } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode } from '../core/state.js';
import { alertSnapshot, openWeatherPopup, warningHash, radarHash } from '../core/weather-alerts.js';

const styles = `
:host{display:block;color:var(--mb-ink);font-family:inherit}*{box-sizing:border-box}
.controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}button,a{font:inherit;min-height:44px;border:1px solid var(--mb-line);border-radius:16px;background:var(--mb-soft);color:var(--mb-ink);padding:10px 14px;text-decoration:none;cursor:pointer}
button{display:flex;align-items:center;gap:10px;text-align:left;max-width:100%}button svg{flex:none;width:22px;height:22px}button strong{display:block;font-size:14px}small{display:block;color:var(--mb-muted);font-size:12px;line-height:1.6}
.warning{border-left:5px solid var(--mb-accent)}.level-2{border-left-color:#b47b17}.level-3{border-left-color:#d15b21}.level-4{border-left-color:#b52e44}.problem{margin:8px 0;font-size:13px;color:var(--mb-muted)}
article{padding:18px;margin-bottom:14px;border:1px solid var(--mb-line);border-left-width:5px;border-radius:18px;background:var(--mb-surface)}h2{font-size:21px;margin:0 0 12px;overflow-wrap:anywhere}h3{font-size:17px;margin:18px 0 8px}p{font-size:16px;line-height:1.6;white-space:pre-line;overflow-wrap:anywhere}dl{font-size:15px;line-height:1.6;margin:0}dt{font-weight:600}dd{margin:0 0 8px}
img{display:block;width:100%;height:auto;border-radius:16px}.radar-link{display:inline-block;margin-top:12px}button:focus-visible,a:focus-visible{outline:2px solid var(--mb-accent);outline-offset:3px}
`;

export class MufflonbauWeatherAlerts extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(config) { this._config = config; this._render(); }
  set hass(value) {
    const previous = this._hass; this._hass = value;
    if (!previous || previous.states[this._config?.weather_alerts?.entity] !== value.states[this._config?.weather_alerts?.entity] || previous.themes !== value.themes) this._render();
    this._autoOpen();
  }
  connectedCallback() { this._render(); }
  getCardSize() { return ['compact', 'status'].includes(this._config?.mode) ? 1 : 5; }
  _autoOpen() {
    if (!['compact', 'observer'].includes(this._config?.mode) || !this._hass) return;
    const config = this._config.weather_alerts;
    const state = this._hass.states[config.entity];
    const token = state?.attributes?.popup_token;
    if (!token || !alertSnapshot(state).warnings.some(w => Number(w.level) >= 3)) return;
    const key = `mufflonbau-warning:${window.location.pathname.split('/')[1]}:${this._hass.user?.id ?? ''}:${config.entity}`;
    try {
      if (window.localStorage.getItem(key) === token) return;
    } catch { if (this._lastToken === token) return; }
    if (this._pendingToken === token || this._lastToken === token) return;
    this._pendingToken = token;
    // Wait until the shell has also mounted its standalone Bubble pop-ups.
    clearTimeout(this._openTimer);
    this._openTimer = setTimeout(() => {
      this._pendingToken = undefined;
      if (!this.isConnected) return;
      this._lastToken = token;
      try { window.localStorage.setItem(key, token); } catch { /* In-memory deduplication still applies. */ }
      openWeatherPopup(warningHash);
    }, 500);
  }
  disconnectedCallback() { clearTimeout(this._openTimer); }
  _render() {
    if (!this._config || !this._hass) return;
    if (this._config.mode === 'observer') { this.shadowRoot.replaceChildren(); return; }
    const config = this._config.weather_alerts;
    const de = this._config.language === 'de';
    applyTheme(this, appearanceMode(this._config.appearance, this._hass.states, this._hass.themes?.darkMode), this._config.appearance?.theme);
    const { available, warnings, problems } = alertSnapshot(this._hass.states[config.entity]);
    const content = element('div');
    const date = value => {
      if (!value || !Number.isFinite(Date.parse(value))) return '–';
      return new Intl.DateTimeFormat(de ? 'de-DE' : 'en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: this._hass.config?.time_zone }).format(new Date(value));
    };
    if (['compact', 'status'].includes(this._config.mode)) {
      const controls = element('div', undefined, 'controls');
      if (this._config.mode === 'status' && !warnings.length) {
        const status = element('button'); status.type = 'button';
        const clear = available && !problems.length;
        status.append(icon('warning'), element('strong', `NINA & DWD · ${de
          ? (clear ? 'Keine aktiven Warnungen' : 'Warnstatus prüfen')
          : (clear ? 'No active warnings' : 'Check warning status')}`));
        status.addEventListener('click', () => openWeatherPopup(warningHash)); controls.append(status);
      }
      if (config.radar) {
        const rain = element('button'); rain.type = 'button'; rain.append(icon('drop'), element('strong', de ? 'Regenradar' : 'Rain radar'));
        rain.addEventListener('click', () => openWeatherPopup(radarHash)); controls.append(rain);
      }
      for (const source of ['NINA', 'DWD']) {
        const items = warnings.filter(w => w.source === source);
        if (!items.length) continue;
        const first = items[0]; const button = element('button', undefined, `warning level-${first.level}`); button.type = 'button';
        const copy = element('span'); copy.append(element('strong', `${source} · ${first.title}`),
          element('small', `${first.severity} · ${first.area}${first.end ? ` · ${de ? 'bis' : 'until'} ${date(first.end)}` : ''}`),
          element('small', String(first.description ?? '').slice(0, 160)));
        if (items.length > 1) copy.append(element('small', `+${items.length - 1}`));
        button.append(icon('warning'), copy); button.addEventListener('click', () => openWeatherPopup(warningHash)); controls.append(button);
      }
      content.append(controls);
    } else if (this._config.mode === 'radar') {
      const radar = config.radar;
      if (radar?.image_url) {
        const img = element('img'); img.src = radar.image_url; img.alt = de ? 'Animiertes DWD Niederschlagsradar' : 'Animated DWD precipitation radar';
        img.addEventListener('error', () => { img.remove(); content.prepend(element('p', de ? 'Radarbild nicht erreichbar.' : 'Radar image unavailable.')); }); content.append(img);
      }
      content.append(element('p', radar?.caption ?? 'Daten: Deutscher Wetterdienst (DWD)'));
      if (radar?.url) { const link = element('a', de ? 'Beim DWD öffnen' : 'Open DWD radar', 'radar-link'); link.href = radar.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; content.append(link); }
    } else {
      if (!warnings.length && available && !problems.length) content.append(element('p', de ? 'Keine aktiven Warnungen.' : 'No active warnings.'));
      for (const w of warnings) {
        const section = element('article', undefined, `level-${w.level}`); section.append(element('h2', `${w.source} · ${w.title}`));
        const meta = element('dl');
        for (const [label, value] of [[de ? 'Warnstufe' : 'Severity', w.severity], [de ? 'Art' : 'Type', w.type],
          [de ? 'Betroffenes Gebiet' : 'Affected area', w.area], [de ? 'Beginn' : 'Start', date(w.start)], [de ? 'Gültig bis' : 'Valid until', date(w.end)]]) {
          if (value) meta.append(element('dt', label), element('dd', String(value)));
        }
        section.append(meta, element('p', w.description ?? ''));
        if (w.instruction) section.append(element('h3', de ? 'Verhaltensempfehlung' : 'Recommended action'), element('p', w.instruction));
        content.append(section);
      }
    }
    if (this._config.mode === 'details' && (!available || problems.length)) {
      content.append(element('p', de ? 'Warnstatus unvollständig.' : 'Warning status incomplete.', 'problem'));
      const link = element('a', de ? 'Details im Systemstatus' : 'Details in system checks');
      navigateLink(link, 'system'); content.append(link);
    }
    this.shadowRoot.replaceChildren(element('style', styles), content);
  }
}

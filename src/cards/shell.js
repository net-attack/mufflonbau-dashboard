import { element, icon, navigateLink } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode } from '../core/state.js';
import { translations } from '../core/i18n.js';
const shellStyles = `
  :host { display:block; min-width:0; min-height:calc(100dvh - 56px); background:var(--mb-canvas); color:var(--mb-ink); font-family:Inter,'Avenir Next',system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
  * { box-sizing:border-box; } .shell { display:grid; grid-template-columns:210px minmax(0,1fr); min-height:inherit; }
  aside { padding:38px 22px; border-right:1px solid var(--mb-line); display:flex; flex-direction:column; gap:48px; }
  .brand { display:flex; gap:12px; align-items:center; font-weight:750; font-size:19px; letter-spacing:-.6px; }
  .monogram { display:grid; place-items:center; width:40px; height:40px; border-radius:14px; background:var(--mb-accent); color:var(--mb-canvas); font-size:23px; }
  nav { display:flex; flex-direction:column; gap:8px; position:sticky; top:30px; }
  nav svg { flex-shrink:0; }
  a { display:flex; align-items:center; gap:13px; padding:14px 15px; color:var(--mb-muted); text-decoration:none; border-radius:14px; font-size:13px; font-weight:600; }
  a[aria-current=page] { background:var(--mb-active); color:var(--mb-accent); } a:hover { color:var(--mb-accent); background:var(--mb-soft); }
  .more-menu { display:none; }
  a:focus-visible { outline:2px solid var(--mb-accent); outline-offset:3px; }
  .footnote { margin-top:auto; padding:24px 12px 0; font-size:10px; line-height:1.7; letter-spacing:2px; color:var(--mb-muted); text-transform:uppercase; }
  main { min-width:0; padding:38px clamp(20px,3vw,52px) 48px; max-width:1560px; width:100%; margin:0 auto; }
  .topline { display:flex; justify-content:space-between; align-items:center; margin:0 0 30px; color:var(--mb-muted); font-size:10px; letter-spacing:2px; text-transform:uppercase; }
  .status { display:flex; align-items:center; gap:7px; letter-spacing:1px; } .dot { width:6px; height:6px; border-radius:50%; background:var(--mb-accent); }
  .heading { font-size:36px; letter-spacing:-1.6px; font-weight:600; margin:0 0 30px; }
  .content { display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); align-items:start; gap:22px; }
  .slot { min-width:0; grid-column:span 6; } .slot.wide { grid-column:1/-1; } .slot.rooms { grid-column:span 8; } .slot.compact { grid-column:span 4; }
  .slot.devices { grid-column:span 8; } .slot ha-card { background:var(--mb-surface); }
  @media(min-width:1700px) { .shell { grid-template-columns:240px minmax(0,1fr); } }
  @media(max-width:1100px) { .shell { grid-template-columns:170px minmax(0,1fr); } aside { padding:28px 12px; } .brand { font-size:16px; } .slot.rooms,.slot.devices { grid-column:span 12; } .slot.compact { grid-column:span 6; } }
  @media(max-width:700px) { .shell { display:flex; flex-direction:column; } aside { padding:16px; border:0; gap:18px; display:contents; } .brand,.footnote { display:none; } main { padding:22px 16px 92px; } .topline { margin-bottom:22px; letter-spacing:1px; } .heading { font-size:28px; } nav { position:fixed; inset:auto 12px 12px; z-index:10; flex-direction:row; overflow-x:auto; gap:2px; padding:7px; border:1px solid var(--mb-line); background:var(--mb-surface); border-radius:22px; box-shadow:0 8px 28px #00000012; } a { flex:1; min-width:58px; gap:5px; flex-direction:column; padding:10px 5px; font-size:9px; white-space:nowrap; } .secondary { display:none; } .more-menu { display:block; flex:1; min-width:58px; } summary { display:flex; flex-direction:column; align-items:center; gap:5px; padding:10px 5px; font-size:9px; color:var(--mb-muted); cursor:pointer; list-style:none; } summary::-webkit-details-marker { display:none; } .more-links { position:fixed; bottom:94px; right:14px; min-width:180px; padding:8px; background:var(--mb-surface); border:1px solid var(--mb-line); border-radius:18px; box-shadow:0 8px 24px #0002; } .more-links a { flex-direction:row; font-size:12px; padding:14px; } nav svg { width:19px; height:19px; } .content { gap:16px; } .slot,.slot.compact { grid-column:1/-1; } .status { font-size:9px; } }
  @media(prefers-reduced-motion:no-preference) { a { transition:background .15s,color .15s; } }
`;
export class MufflonbauShell extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._children = []; this._generation = 0; }
  setConfig(config) {
    this._config = config;
    this._generation++;
    this._render();
    this._loadCards(this._generation);
  }
  set hass(hass) {
    this._hass = hass;
    applyTheme(this, appearanceMode(this._config?.appearance, hass.states, hass.themes?.darkMode));
    for (const card of this._children) card.hass = hass;
  }
  getCardSize() { return 12; }
  _render() {
    if (!this._config) return;
    const text = translations[this._config.language ?? 'en'];
    const shell = element('div', undefined, 'shell');
    const aside = element('aside');
    const brand = element('div', undefined, 'brand');
    brand.append(element('span', 'm', 'monogram'), element('span', this._config.title ?? 'Mufflonbau'));
    const nav = element('nav'); nav.setAttribute('aria-label', text.navigation);
    const extraLinks = [];
    for (const [index, item] of (this._config.navigation ?? []).entries()) {
      const link = element('a');
      link.append(icon(item.path), element('span', item.path === 'system' ? text.systemShort : item.title));
      navigateLink(link, item.path);
      if (item.path === this._config.path || (item.path === 'rooms' && this._config.path.startsWith('room-'))) link.setAttribute('aria-current', 'page');
      if (index >= 4) { link.classList.add('secondary'); extraLinks.push(item); }
      nav.append(link);
    }
    if (extraLinks.length) {
      const more = element('details', undefined, 'more-menu');
      const summary = element('summary'); summary.append(icon('expert'), element('span', text.more));
      const links = element('div', undefined, 'more-links');
      for (const item of extraLinks) {
        const link = element('a'); link.append(icon(item.path), element('span', item.path === 'system' ? text.systemShort : item.title)); navigateLink(link, item.path);
        if (item.path === this._config.path) link.setAttribute('aria-current', 'page');
        links.append(link);
      }
      more.append(summary, links); nav.append(more);
    }
    aside.append(brand, nav, element('div', text.yourSpace, 'footnote'));
    const main = element('main');
    const top = element('div', undefined, 'topline');
    const status = element('span', undefined, 'status'); status.append(element('span', undefined, 'dot'), element('span', text.live));
    top.append(element('span', `${this._config.title ?? 'Mufflonbau'} / ${this._config.view_title}`), status);
    main.append(top);
    if (this._config.path !== 'home') main.append(element('h1', this._config.view_title, 'heading'));
    this._content = element('div', undefined, 'content');
    main.append(this._content); shell.append(aside, main);
    this._children = [];
    this.shadowRoot.replaceChildren(element('style', shellStyles), shell);
    if (this._hass) this.hass = this._hass;
  }
  async _loadCards(generation) {
    // Native elements are created through HA's supported card helper API.
    let helpers;
    if (this._config.cards.some(card => !card.type.startsWith('custom:mufflonbau-'))) {
      try { helpers = await window.loadCardHelpers?.(); } catch { /* Show an explicit load error below. */ }
    }
    if (generation !== this._generation) return;
    for (const config of this._config.cards) {
      const slot = element('section', undefined, 'slot');
      const layout = { header: 'wide', climate: 'rooms', people: 'compact', devices: 'devices', cleaning: 'compact', warnings: 'compact', floorplan: 'wide', message: 'wide' }[config.mode];
      if (layout) slot.classList.add(layout);
      let card;
      if (config.type === 'custom:mufflonbau-live') {
        card = document.createElement('mufflonbau-live'); card.setConfig(config);
      } else if (helpers) card = helpers.createCardElement(config);
      else card = element('p', translations[this._config.language ?? 'en'].cardLoadError);
      if (this._hass) card.hass = this._hass;
      this._children.push(card); slot.append(card); this._content.append(slot);
    }
  }
}

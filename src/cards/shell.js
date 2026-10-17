import { shellStyles } from '../design/shell-styles.js';
import { element, icon, navigateLink } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode } from '../core/state.js';
import { translations } from '../core/i18n.js';
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
    applyTheme(this, appearanceMode(this._config?.appearance, hass.states, hass.themes?.darkMode), this._config?.appearance?.theme);
    for (const card of this._children) card.hass = hass;
  }
  getCardSize() { return 12; }
  _render() {
    if (!this._config) return;
    const text = translations[this._config.language ?? 'en'];
    const shell = element('div', undefined, 'shell');
    this.dataset.view = this._config.path;
    if (this._config.full_view) this.setAttribute('data-full-view', 'true'); else this.removeAttribute('data-full-view');
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
      if (config.mode) slot.classList.add(`mode-${config.mode}`);
      const layout = { header: 'wide', climate: 'rooms', people: 'compact', devices: 'devices', cleaning: 'cleaning', warnings: 'compact', floorplan: 'wide', message: 'wide' }[config.mode];
      if (layout) slot.classList.add(layout);
      let card;
      if (['custom:mufflonbau-live', 'custom:mufflonbau-admin', 'custom:mufflonbau-history', 'custom:mufflonbau-cleaning'].includes(config.type)) {
        card = document.createElement(config.type.slice(7)); card.setConfig(config);
        if (config.type === 'custom:mufflonbau-admin') slot.classList.add('wide');
        if (config.type === 'custom:mufflonbau-cleaning') slot.classList.add('cleaning');
      } else if (helpers) card = helpers.createCardElement(config);
      else card = element('p', translations[this._config.language ?? 'en'].cardLoadError);
      if (this._hass) card.hass = this._hass;
      if (config.type === 'picture-entity' && config.entity?.startsWith('camera.')) slot.classList.add('cleaning-map');
      if (this._config.path === 'calendar') slot.classList.add('calendar');
      this._children.push(card); slot.append(card); this._content.append(slot);
    }
  }
}

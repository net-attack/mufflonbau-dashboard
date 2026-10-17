import { shellStyles } from '../design/shell-styles.js';
import { element, icon, navigateLink } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode } from '../core/state.js';
import { translations } from '../core/i18n.js';
import { mapGestures } from '../design/map-gestures.js';
export class MufflonbauShell extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._children = []; this._generation = 0; this._mapControls = []; }
  disconnectedCallback() { for (const control of this._mapControls) control.destroy(); this._navObserver?.disconnect(); }
  setConfig(config) {
    this._navObserver?.disconnect();
    for (const control of this._mapControls) control.destroy();
    this._mapControls = [];
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
    const quickBack = ['rooms', 'presence', 'system', 'climate', 'cleaning'].includes(this._config.path);
    const expertView = this._config.path === 'expert';
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
    const back = element('a', `← ${expertView ? text.admin : text.home}`, 'back-link'); navigateLink(back, expertView ? 'admin' : 'home');
    if (quickBack) {
      shell.addEventListener('click', event => {
        const path = event.composedPath();
        if (path.some(node => node.matches?.('a,button,select,summary,input,.interactive-plan,.camera-viewport'))) return;
        if (path[0]?.matches?.('main,.shell,.content,.slot,ha-card,.grid,.people-grid,.warnings-grid,.system-summary,.panel')) back.click();
      });
    }
    const top = element('div', undefined, 'topline');
    const status = element('span', undefined, 'status'); status.append(element('span', undefined, 'dot'), element('span', text.live));
    top.append(element('span', `${this._config.title ?? 'Mufflonbau'} / ${this._config.view_title}`), status);
    if (!quickBack && !expertView) main.append(top);
    if (this._config.path !== 'home' && this._config.path !== 'rooms') {
      const header = element('div', undefined, 'view-header');
      if (quickBack || expertView) header.append(back);
      header.append(element('h1', this._config.view_title, 'heading')); main.append(header);
    }
    this._content = element('div', undefined, 'content');
    main.append(this._content); shell.append(aside, main);
    this._children = [];
    this.shadowRoot.replaceChildren(element('style', shellStyles), shell);
    this._navObserver = new ResizeObserver(() => {
      const styles = getComputedStyle(nav);
      const space = styles.position === 'fixed' ? nav.getBoundingClientRect().height + parseFloat(styles.bottom || 0) + 12 : 16;
      this.style.setProperty('--mb-nav-space', `${space}px`);
    });
    this._navObserver.observe(nav);
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
      const layout = { header: 'wide', climate: 'rooms', 'room-summary': 'compact', people: 'compact', 'presence-summary': 'compact', devices: 'devices', cleaning: 'cleaning', warnings: 'compact', floorplan: 'wide', message: 'wide' }[config.mode];
      if (layout) slot.classList.add(layout);
      let card;
      if (['custom:mufflonbau-live', 'custom:mufflonbau-admin', 'custom:mufflonbau-history', 'custom:mufflonbau-cleaning'].includes(config.type)) {
        card = document.createElement(config.type.slice(7)); card.setConfig(config);
        if (config.type === 'custom:mufflonbau-admin') slot.classList.add('wide');
        if (config.type === 'custom:mufflonbau-cleaning') slot.classList.add('cleaning');
      } else if (helpers) card = helpers.createCardElement(config);
      else card = element('p', translations[this._config.language ?? 'en'].cardLoadError);
      if (this._hass) card.hass = this._hass;
      const cameraMap = config.type === 'picture-entity' && config.entity?.startsWith('camera.') && this._config.path === 'cleaning';
      if (cameraMap) slot.classList.add('cleaning-map');
      if (this._config.path === 'calendar') slot.classList.add('calendar');
      this._children.push(card);
      if (cameraMap) {
        const viewport = element('div', undefined, 'camera-viewport');
        const image = element('div', undefined, 'camera-content'); image.append(card); viewport.append(image); slot.append(viewport);
        const camera = { zoom: 1, x: 0, y: 0 };
        const controls = mapGestures(viewport, image, camera); this._mapControls.push(controls);
        const toolbar = element('div', undefined, 'camera-toolbar');
        const text = translations[this._config.language ?? 'en'];
        for (const [label, title, change] of [['−', text.zoomOut, -.5], ['+', text.zoomIn, .5], ['↺', text.resetMap, 0]]) {
          const button = element('button', label); button.setAttribute('aria-label', title);
          button.addEventListener('click', () => change ? controls.zoom(camera.zoom + change) : controls.reset()); toolbar.append(button);
        }
        slot.append(toolbar);
      } else slot.append(card);
      this._content.append(slot);
    }
  }
}

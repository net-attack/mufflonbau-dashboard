import { shellStyles } from '../design/shell-styles.js';
import { element, icon, navigateLink } from '../design/dom.js';
import { applyTheme } from '../design/tokens.js';
import { appearanceMode } from '../core/state.js';
import { translations } from '../core/i18n.js';
import { mapGestures } from '../design/map-gestures.js';
import { applyFlusenfelsTheme, flusenfelsShellStyles, saugfriedArt } from '../design/flusenfels.js';
import { cleaningPageText } from '../core/cleaning-theme.js';
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
    const mode = appearanceMode(this._config?.appearance, hass.states, hass.themes?.darkMode);
    applyTheme(this, mode, this._config?.appearance?.theme);
    if (this._config?.path === 'cleaning' && this._config.cleaning_theme === 'flusenfels') applyFlusenfelsTheme(this, mode);
    for (const card of this._children) card.hass = hass;
  }
  getCardSize() { return 12; }
  _render() {
    if (!this._config) return;
    const text = translations[this._config.language ?? 'en'];
    const quickBack = ['rooms', 'presence', 'system', 'climate', 'cleaning', 'shopping', 'ventilation'].includes(this._config.path);
    const expertView = this._config.path === 'expert';
    const shell = element('div', undefined, 'shell');
    this.dataset.view = this._config.path;
    this.toggleAttribute('data-has-shopping', Boolean(this._config.shopping_enabled));
    this.toggleAttribute('data-has-laundry', this._config.cards.some(card => card.type === 'custom:mufflonbau-laundry'));
    if (this._config.path === 'home' && this._config.cards.some(card => card.mode === 'ventilation')) this.dataset.ventilation = 'true';
    else delete this.dataset.ventilation;
    if (this._config.path === 'cleaning' && this._config.cleaning_theme === 'flusenfels') this.dataset.cleaningTheme = 'flusenfels';
    else delete this.dataset.cleaningTheme;
    if (this._config.full_view) this.setAttribute('data-full-view', 'true'); else this.removeAttribute('data-full-view');
    const aside = element('aside');
    const brand = element('div', undefined, 'brand');
    brand.append(element('span', 'm', 'monogram'), element('span', this._config.title ?? 'Mufflonbau'));
    const nav = element('nav'); nav.setAttribute('aria-label', text.navigation);
    for (const item of this._config.navigation ?? []) {
      const link = element('a');
      const label = { system: text.systemShort, admin: text.adminShort, presence: text.presenceShort }[item.path] ?? item.title;
      link.setAttribute('aria-label', item.title); link.title = item.title;
      link.append(icon(item.path === 'presence' ? 'person' : item.path), element('span', label));
      navigateLink(link, item.path);
      if (item.path === this._config.path || (item.path === 'rooms' && this._config.path.startsWith('room-'))) link.setAttribute('aria-current', 'page');
      nav.append(link);
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
    this.shadowRoot.replaceChildren(element('style', `${shellStyles}\n${flusenfelsShellStyles}`), shell);
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
      const layout = { ventilation: config.compact ? 'compact' : 'wide', header: 'wide', climate: 'rooms', 'room-summary': 'compact', people: 'compact', 'presence-summary': 'compact', devices: 'devices', cleaning: 'cleaning', warnings: 'compact', floorplan: 'wide', message: 'wide' }[config.mode];
      if (layout) slot.classList.add(layout);
      let card;
      if (['custom:mufflonbau-live', 'custom:mufflonbau-admin', 'custom:mufflonbau-history', 'custom:mufflonbau-cleaning', 'custom:mufflonbau-presence', 'custom:mufflonbau-shopping', 'custom:mufflonbau-maintenance', 'custom:mufflonbau-laundry'].includes(config.type)) {
        card = document.createElement(config.type.slice(7)); card.setConfig(config);
        if (config.type === 'custom:mufflonbau-admin') slot.classList.add('wide');
        if (config.type === 'custom:mufflonbau-presence') slot.classList.add('wide');
        if (config.type === 'custom:mufflonbau-cleaning') slot.classList.add('cleaning');
        if (config.type === 'custom:mufflonbau-shopping') slot.classList.add('shopping-summary');
        if (config.type === 'custom:mufflonbau-maintenance') slot.classList.add('wide');
        if (config.type === 'custom:mufflonbau-laundry') slot.classList.add('compact', 'laundry');
      } else if (helpers) card = helpers.createCardElement(config);
      else card = element('p', translations[this._config.language ?? 'en'].cardLoadError);
      if (this._hass) card.hass = this._hass;
      const cameraMap = config.type === 'picture-entity' && config.entity?.startsWith('camera.') && this._config.path === 'cleaning';
      if (cameraMap) slot.classList.add('cleaning-map');
      if (this._config.path === 'calendar') slot.classList.add('calendar');
      if (this._config.path === 'shopping') slot.classList.add('wide');
      this._children.push(card);
      if (cameraMap) {
        const viewport = element('div', undefined, 'camera-viewport');
        const image = element('div', undefined, 'camera-content'); image.append(card); viewport.append(image); slot.append(viewport);
        if (this._config.cleaning_theme === 'flusenfels') {
          const title = element('div', undefined, 'royal-map-title');
          title.append(saugfriedArt('castle', 'castle'), element('span', cleaningPageText({ theme: 'flusenfels' }, this._config.language ?? 'en').map)); slot.append(title);
        }
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

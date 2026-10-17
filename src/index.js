import { MufflonbauAdmin } from './cards/admin.js';
import { MufflonbauHistory } from './cards/history.js';
import { MufflonbauPresence } from './cards/presence.js';
import { MufflonbauCleaning } from './cards/cleaning.js';
import { MufflonbauShopping } from './cards/shopping.js';
import { MufflonbauMaintenance } from './cards/maintenance.js';
import { generateDashboard } from './strategy.js';
import { MufflonbauShell } from './cards/shell.js';
import { MufflonbauLiveCard } from './cards/live-card.js';
export class MufflonbauDashboardStrategy extends HTMLElement {
  static getCreateSuggestions() { return { title: 'Mufflonbau', icon: 'mdi:home' }; }
  static async generate(config, hass) { return generateDashboard(config, hass); }
}
if (!customElements.get('mufflonbau-admin')) customElements.define('mufflonbau-admin', MufflonbauAdmin);
if (!customElements.get('mufflonbau-history')) customElements.define('mufflonbau-history', MufflonbauHistory);
if (!customElements.get('mufflonbau-presence')) customElements.define('mufflonbau-presence', MufflonbauPresence);
if (!customElements.get('mufflonbau-cleaning')) customElements.define('mufflonbau-cleaning', MufflonbauCleaning);
if (!customElements.get('mufflonbau-shopping')) customElements.define('mufflonbau-shopping', MufflonbauShopping);
if (!customElements.get('mufflonbau-maintenance')) customElements.define('mufflonbau-maintenance', MufflonbauMaintenance);
if (!customElements.get('mufflonbau-shell')) customElements.define('mufflonbau-shell', MufflonbauShell);
if (!customElements.get('mufflonbau-live')) customElements.define('mufflonbau-live', MufflonbauLiveCard);
if (!customElements.get('ll-strategy-dashboard-mufflonbau')) customElements.define('ll-strategy-dashboard-mufflonbau', MufflonbauDashboardStrategy);
window.customStrategies = window.customStrategies || [];
if (!window.customStrategies.some(strategy => strategy.type === 'mufflonbau')) {
  window.customStrategies.push({ type: 'mufflonbau', strategyType: 'dashboard', name: 'Mufflonbau',
    description: 'An extensible dashboard for Mufflonbau.', documentationURL: 'https://github.com/net-attack/mufflonbau-dashboard' });
}

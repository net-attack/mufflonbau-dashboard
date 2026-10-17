import { view } from '../core/cards.js';
import { shoppingListCard } from '../core/shopping.js';

export function shoppingViews({ config, language }) {
  if (!config.shopping) return [];
  return [view('shopping', config.shopping.name ?? (language === 'de' ? 'Einkaufsliste' : 'Shopping list'), 'mdi:cart-outline',
    [shoppingListCard(config.shopping, language)], { subview: true })];
}

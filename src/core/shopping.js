import { numericState, stateProblem } from './state.js';

export function shoppingStatus(shopping, hass, language = 'en') {
  const state = hass.states[shopping.entity];
  const value = numericState(state);
  const count = value !== null && Number.isInteger(value) && value >= 0 ? value : null;
  return {
    count,
    problem: stateProblem(state, language) ?? (count === null ? (language === 'de' ? 'Ungültiger Listenstatus' : 'Invalid list status') : null),
    canAdd: count !== null && Boolean(Number(state?.attributes?.supported_features) & 1) && Boolean(hass.services?.todo?.add_item),
  };
}

export function shoppingListCard(shopping, language = 'en') {
  return { type: 'todo-list', entity: shopping.entity, title: shopping.name ?? (language === 'de' ? 'Einkaufsliste' : 'Shopping list'),
    hide_create: false, hide_completed: true, item_tap_action: 'toggle' };
}

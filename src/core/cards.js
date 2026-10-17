export function entityCards(ids) {
  return ids.map(entity => ({ type: 'tile', entity,
    ...(/^(light|switch)\./.test(entity) ? { tap_action: { action: 'toggle' }, hold_action: { action: 'more-info' } } : {}),
  }));
}
export function entityList(ids, title) {
  return ids.length ? [{ type: 'entities', title, entities: ids }] : [];
}
export function navigation(path, name, icon) {
  return { type: 'button', name, icon, tap_action: { action: 'navigate', navigation_path: path } };
}
export function view(path, title, icon, cards, extra = {}) {
  return { type: 'panel', path, title, icon, cards, ...extra };
}
export function liveCard(mode, config, language) {
  return { type: 'custom:mufflonbau-live', mode, language, ...config };
}

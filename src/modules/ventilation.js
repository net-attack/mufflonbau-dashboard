import { liveCard, view } from '../core/cards.js';
export function ventilationViews({ config, text, language }) {
  return config.ventilation ? [view('ventilation', text.ventilation, 'mdi:weather-windy', [
    liveCard('ventilation', { ventilation: config.ventilation, rooms: config.rooms, appearance: config.appearance }, language),
  ], { subview: true })] : [];
}

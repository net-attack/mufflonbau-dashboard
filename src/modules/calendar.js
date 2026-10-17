import { view } from '../core/cards.js';
export function calendarViews({ config, text }) {
  return config.calendars.length ? [view('calendar', text.calendar, 'mdi:calendar-month-outline', [
    { type: 'calendar', initial_view: 'listWeek', entities: config.calendars },
  ])] : [];
}

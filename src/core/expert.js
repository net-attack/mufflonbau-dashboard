export const expertCategories = ['internet', 'network', 'host', 'climate', 'lights', 'cleaning', 'people', 'calendar', 'system', 'switches', 'automations', 'sensors', 'helpers', 'other'];

import { cleaningEntities } from './cleaning.js';

export function categorizeEntities(ids, { rooms = [], cleaning = {}, admin = {}, monitors = [], people = [], calendars = [] } = {}, states = {}) {
  const cleaningIds = new Set([...cleaningEntities(cleaning), ...rooms.flatMap(room => Object.values(room.cleaning ?? {}))]);
  const climateIds = new Set(rooms.flatMap(room => [room.temperature, room.humidity, room.dew_point]));
  const lightIds = new Set(rooms.flatMap(room => [...(room.lights ?? []), ...(room.member_lights ?? [])]));
  const systemIds = new Set(monitors.map(item => item.entity));
  return [...new Set(ids)].map(entity => {
    const domain = entity.split('.')[0];
    let category = 'other';
    if ((admin.internet ?? []).includes(entity)) category = 'internet';
    else if ([...(admin.network ?? []), ...(admin.clients ?? [])].includes(entity)) category = 'network';
    else if ((admin.host ?? []).includes(entity)) category = 'host';
    else if (cleaningIds.has(entity) || domain === 'vacuum') category = 'cleaning';
    else if (climateIds.has(entity) || domain === 'climate' || ['temperature', 'humidity'].includes(states[entity]?.attributes?.device_class)) category = 'climate';
    else if (lightIds.has(entity) || domain === 'light') category = 'lights';
    else if (people.includes(entity) || ['person', 'device_tracker'].includes(domain)) category = 'people';
    else if (calendars.includes(entity) || domain === 'calendar') category = 'calendar';
    else if (systemIds.has(entity)) category = 'system';
    else if (domain === 'switch') category = 'switches';
    else if (['automation', 'script', 'scene'].includes(domain)) category = 'automations';
    else if (['sensor', 'binary_sensor'].includes(domain)) category = 'sensors';
    else if (domain.startsWith('input_') || ['select', 'number', 'button', 'timer', 'counter', 'schedule'].includes(domain)) category = 'helpers';
    return { entity, category };
  });
}

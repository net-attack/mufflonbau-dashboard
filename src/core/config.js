import { normalizeAdmin } from './admin.js';
import { cleaningEntities } from './cleaning.js';
import { validateDrawing } from './floorplan.js';
function fail(path, message) {
  throw new Error(`Mufflonbau: ${path} ${message}`);
}
function object(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object.');
}
function list(value, path) {
  if (!Array.isArray(value)) fail(path, 'must be an array.');
}
function entity(value, path) {
  if (typeof value !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(value)) fail(path, 'must be an entity ID.');
}
function label(value, path) {
  if (typeof value === 'string' && value.trim()) return;
  if (value && typeof value.en === 'string' && typeof value.de === 'string') return;
  fail(path, 'must be a string or an object with en and de strings.');
}
export function normalizeConfig(config) {
  object(config, 'configuration');
  if (config.appearance !== undefined) object(config.appearance, 'appearance');
  if (config.title !== undefined && typeof config.title !== 'string') fail('title', 'must be a string.');
  const result = { ...config, entities: config.entities ?? [], people: config.people ?? [],
    calendars: config.calendars ?? [], rooms: config.rooms ?? [], monitors: config.monitors ?? [],
    expert_entities: config.expert_entities ?? [], appearance: { theme: 'storybook', ...(config.appearance ?? {}) } };
  for (const key of ['entities', 'people', 'calendars', 'expert_entities']) {
    list(result[key], key);
    if (key === 'entities' && result[key].some(id => typeof id !== 'string')) {
      fail(key, 'must be an array of entity IDs.');
    }
    result[key].forEach((id, index) => entity(id, `${key}[${index}]`));
  }
  if (result.weather !== undefined) entity(result.weather, 'weather');
  if (result.shopping !== undefined) {
    object(result.shopping, 'shopping');
    entity(result.shopping.entity, 'shopping.entity');
    if (!result.shopping.entity.startsWith('todo.')) fail('shopping.entity', 'must reference a todo entity.');
    if (result.shopping.name !== undefined && (typeof result.shopping.name !== 'string' || !result.shopping.name.trim())) fail('shopping.name', 'must be a nonempty string.');
  }
  list(result.rooms, 'rooms');
  if (config.floorplan_drawing !== undefined) validateDrawing(config.floorplan_drawing);
  if (config.floorplan_bounds !== undefined && (!Array.isArray(config.floorplan_bounds) || config.floorplan_bounds.length !== 4 || config.floorplan_bounds.some(n => !Number.isFinite(n)) || config.floorplan_bounds[2] <= 0 || config.floorplan_bounds[3] <= 0)) fail('floorplan_bounds', 'must contain x, y, positive width and height.');
  if (config.floorplan_walls !== undefined) {
    list(config.floorplan_walls, 'floorplan_walls');
    config.floorplan_walls.forEach((wall, wallIndex) => {
      list(wall, `floorplan_walls[${wallIndex}]`);
      if (wall.length < 2 || wall.some(point => !Array.isArray(point) || point.length !== 2 || point.some(coordinate => !Number.isFinite(coordinate) || coordinate < 0))) {
        fail(`floorplan_walls[${wallIndex}]`, 'must contain at least two valid non-negative coordinate pairs.');
      }
    });
  }
  const ids = new Set();
  result.rooms = result.rooms.map((room, index) => {
    const path = `rooms[${index}]`;
    object(room, path);
    if (typeof room.id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(room.id) || ids.has(room.id)) {
      fail(`${path}.id`, 'must be a unique lowercase slug.');
    }
    ids.add(room.id);
    label(room.name, `${path}.name`);
    if (room.label_position !== undefined) {
      object(room.label_position, `${path}.label_position`);
      for (const key of ['x', 'y']) if (!Number.isFinite(room.label_position[key]) || room.label_position[key] < 0 || room.label_position[key] > 1) fail(`${path}.label_position.${key}`, 'must be a fraction between 0 and 1.');
    }
    if (room.note !== undefined) label(room.note, `${path}.note`);
    if (room.icon !== undefined && typeof room.icon !== 'string') fail(`${path}.icon`, 'must be a string.');
    const normalized = { ...room, lights: room.lights ?? [], entities: room.entities ?? [] };
    for (const key of ['temperature', 'humidity', 'dew_point']) {
      if (room[key] !== undefined) entity(room[key], `${path}.${key}`);
    }
    for (const key of ['lights', 'entities']) {
      list(normalized[key], `${path}.${key}`);
      normalized[key].forEach(id => entity(id, `${path}.${key}`));
    }
    normalized.objects = room.objects ?? [];
    list(normalized.objects, `${path}.objects`);
    normalized.objects.forEach((item, itemIndex) => {
      const itemPath = `${path}.objects[${itemIndex}]`;
      object(item, itemPath);
      if (typeof item.icon !== 'string' || !['sofa', 'bed', 'kitchen', 'office', 'nursery', 'home', 'rooms', 'climate', 'cleaning', 'light', 'drop'].includes(item.icon)) {
        fail(`${itemPath}.icon`, 'must be a supported schematic icon.');
      }
      label(item.name, `${itemPath}.name`);
      object(item.position, `${itemPath}.position`);
      for (const key of ['x', 'y']) {
        if (!Number.isFinite(item.position[key]) || item.position[key] < 0 || item.position[key] > 1) {
          fail(`${itemPath}.position.${key}`, 'must be a fraction between 0 and 1.');
        }
      }
      if (item.entity !== undefined) entity(item.entity, `${itemPath}.entity`);
      if (item.wall_switch !== undefined && (typeof item.wall_switch !== 'boolean' || item.wall_switch && !item.entity?.startsWith('light.'))) fail(`${itemPath}.wall_switch`, 'must be boolean and requires a light entity when enabled.');
      if (item.action !== undefined && !['toggle', 'more-info'].includes(item.action)) fail(`${itemPath}.action`, 'must be toggle or more-info.');
      if (item.action === 'toggle' && item.entity && !/^(light|switch)\./.test(item.entity)) fail(`${itemPath}.action`, 'toggle requires a light or switch entity.');
    });
    if (room.cleaning !== undefined) {
      object(room.cleaning, `${path}.cleaning`);
      for (const [key, id] of Object.entries(room.cleaning)) {
        if (!['vacuum', 'mop', 'clean_genius'].includes(key)) fail(`${path}.cleaning`, 'only supports vacuum, mop, and clean_genius.');
        entity(id, `${path}.cleaning.${key}`);
        if (!/^(input_button|script)\./.test(id)) fail(`${path}.cleaning.${key}`, 'must reference an input_button or script.');
      }
    }
    if (room.position !== undefined) {
      object(room.position, `${path}.position`);
      if (room.position.points !== undefined || room.position.parts !== undefined) {
        const { points, parts } = room.position;
        if (points !== undefined && parts !== undefined) fail(`${path}.position`, 'must use points or parts, not both.');
        const shapes = parts ?? [points];
        list(shapes, `${path}.position.parts`);
        if (!shapes.length) fail(`${path}.position`, 'must contain at least one polygon.');
        shapes.forEach((polygon, polygonIndex) => {
          list(polygon, `${path}.position.parts[${polygonIndex}]`);
          if (polygon.length < 3) fail(`${path}.position.parts[${polygonIndex}]`, 'must contain at least three points.');
          polygon.forEach((point, pointIndex) => {
            if (!Array.isArray(point) || point.length !== 2 || point.some(coordinate => !Number.isFinite(coordinate) || coordinate < 0)) {
              fail(`${path}.position.parts[${polygonIndex}][${pointIndex}]`, 'must contain two valid non-negative coordinates.');
            }
          });
        });
        normalized.position = { ...(points === undefined ? { parts } : { points }) };
        return { ...normalized, lights: normalized.lights };
      }
      // HA's YAML 1.1 editor parses an unquoted y key as boolean true.
      // Recover already saved configurations without mutating their input.
      const { true: legacyY, ...position } = room.position;
      normalized.position = { ...position, y: position.y ?? legacyY };
      for (const key of ['x', 'y', 'width', 'height']) {
        const number = normalized.position[key];
        if (!Number.isFinite(number) || number < 0 || (['width', 'height'].includes(key) && number === 0)) {
          fail(`${path}.position.${key}`, 'must be a valid non-negative coordinate or positive size.');
        }
      }
    }
    return normalized;
  });
  result.floorplan_objects = config.floorplan_objects ?? [];
  list(result.floorplan_objects, 'floorplan_objects');
  const markerIds = new Set();
  result.floorplan_objects.forEach((item, index) => {
    const path = `floorplan_objects[${index}]`;
    object(item, path);
    if (typeof item.id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(item.id) || markerIds.has(item.id)) fail(`${path}.id`, 'must be a unique lowercase slug.');
    markerIds.add(item.id);
    if (!ids.has(item.room)) fail(`${path}.room`, 'must reference a configured room.');
    label(item.name, `${path}.name`);
    if (!['light', 'climate', 'cleaning', 'office', 'home', 'rooms', 'drop'].includes(item.icon)) fail(`${path}.icon`, 'must be a supported device icon.');
    object(item.position, `${path}.position`);
    for (const key of ['x', 'y']) if (!Number.isFinite(item.position[key])) fail(`${path}.position.${key}`, 'must be a finite map coordinate.');
    if (item.entity !== undefined) entity(item.entity, `${path}.entity`);
    if (item.wall_switch !== undefined && (typeof item.wall_switch !== 'boolean' || item.wall_switch && !item.entity?.startsWith('light.'))) fail(`${path}.wall_switch`, 'must be boolean and requires a light entity when enabled.');
    if (item.action !== undefined && !['toggle', 'more-info'].includes(item.action)) fail(`${path}.action`, 'must be toggle or more-info.');
    if (item.action === 'toggle' && (!item.entity || !/^(light|switch)\./.test(item.entity))) fail(`${path}.action`, 'toggle requires a light or switch entity.');
    if (item.kind !== undefined && !['window', 'temperature'].includes(item.kind)) fail(`${path}.kind`, 'must be window or temperature.');
    if (item.kind === 'window' && item.entity && !item.entity.startsWith('binary_sensor.')) fail(`${path}.entity`, 'a window contact requires a binary_sensor.');
  });
  list(result.monitors, 'monitors');
  result.monitors.forEach((monitor, index) => {
    object(monitor, `monitors[${index}]`);
    entity(monitor.entity, `monitors[${index}].entity`);
    if (monitor.name !== undefined) label(monitor.name, `monitors[${index}].name`);
    if (monitor.battery_below !== undefined && (!Number.isFinite(monitor.battery_below) || monitor.battery_below < 0 || monitor.battery_below > 100)) {
      fail(`monitors[${index}].battery_below`, 'must be a number between 0 and 100.');
    }
  });
  if (result.cleaning !== undefined) {
    object(result.cleaning, 'cleaning');
    if (result.cleaning.theme !== undefined && !['default', 'flusenfels'].includes(result.cleaning.theme)) fail('cleaning.theme', 'must be default or flusenfels.');
    for (const key of ['entity', 'battery', 'current_room', 'map']) {
      if (result.cleaning[key] !== undefined) entity(result.cleaning[key], `cleaning.${key}`);
    }
  }
  if (result.kiosk_mode !== undefined) {
    object(result.kiosk_mode, 'kiosk_mode');
    for (const [key, value] of Object.entries(result.kiosk_mode)) {
      if (!['kiosk', 'hide_header', 'hide_sidebar'].includes(key) || typeof value !== 'boolean') {
        fail('kiosk_mode', 'supports boolean kiosk, hide_header, and hide_sidebar options.');
      }
    }
  }
  result.kiosk_mode ??= { kiosk: true, hide_header: true };
  if (result.appearance !== undefined) {
    object(result.appearance, 'appearance');
    if (!['calm', 'atmospheric', 'storybook'].includes(result.appearance.theme)) fail('appearance.theme', 'must be calm, atmospheric, or storybook.');
    if (!['auto', 'ambient', 'night'].includes(result.appearance.mode ?? 'auto')) fail('appearance.mode', 'must be auto, ambient, or night.');
    for (const key of ['night_person', 'ambient_person']) {
      if (result.appearance[key] !== undefined) entity(result.appearance[key], `appearance.${key}`);
    }
  }
  result.admin = normalizeAdmin(result.admin ?? {}, entity);
  return result;
}

export function collectEntities(config) {
  return [...new Set([
    ...Object.values(config.admin ?? {}).flat(), ...config.entities, ...config.people, ...config.calendars, ...config.expert_entities,
    config.weather, config.shopping?.entity, ...config.monitors.map(monitor => monitor.entity),
    ...config.rooms.flatMap(room => [room.temperature, room.humidity, room.dew_point,
      ...room.lights, ...(room.member_lights ?? []), ...room.entities, ...Object.values(room.cleaning ?? {})]),
    ...config.rooms.flatMap(room => (room.objects ?? []).map(item => item.entity)),
    ...(config.floorplan_objects ?? []).map(item => item.entity),
    ...cleaningEntities(config.cleaning), config.appearance?.night_person, config.appearance?.ambient_person,
  ].filter(Boolean))];
}

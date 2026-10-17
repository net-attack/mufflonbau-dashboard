// Synthetic installation shared by screenshots and browser integration checks.
const rooms = [
  ['living', 'Living and dining', 'Wohn- und Essbereich', 21.1, 61.1],
  ['office', 'Office', 'Arbeitszimmer', 22.8, 54.9],
  ['kitchen', 'Kitchen', 'Küche', 22.5, 58.5],
  ['bedroom', 'Bedroom', 'Schlafzimmer', 19.6, 42],
  ['bathroom', 'Bathroom', 'Badezimmer', 21.4, 63],
  ['hall', 'Hall', 'Flur', 20.2, 49],
].map(([id, en, de], index) => ({ id, name: { en, de }, temperature: `sensor.${id}_temperature`, humidity: `sensor.${id}_humidity`, lights: [`light.${id}`], position: { x: index % 2 * 320, y: Math.floor(index / 2) * 200, width: 300, height: 180 },
  cleaning: { vacuum: `input_button.vacuum_${id}`, mop: `input_button.mop_${id}`, clean_genius: `script.clean_genius_${id}` } }));
export const previewConfig = {
  type: 'custom:mufflonbau', title: 'Mufflonbau', language: 'de', appearance: {}, rooms,
  // Deliberately generic rectangles, never the private apartment geometry.
  floorplan_drawing: rooms.map(room => ({ tag: 'g', children: [
    { tag: 'rect', attrs: { x: room.position.x + 20, y: room.position.y + 12, width: 70, height: 35, rx: 4, fill: 'furniture', stroke: 'wall' } },
    { tag: 'path', attrs: { d: `M${room.position.x+120} ${room.position.y}h60`, stroke: 'water', 'stroke-width': 5 } },
  ] })),
  floorplan_objects: [
    ...rooms.map(room => ({ id: `${room.id}-lamp`, room: room.id, icon: 'light', name: `Lampe ${room.name.de}`, position: { x: room.position.x + 240, y: room.position.y + 40 }, entity: room.lights[0], action: 'toggle', wall_switch: true })),
    { id: 'window', room: 'bathroom', icon: 'rooms', name: 'Fensterkontakt', position: { x: 10, y: 480 }, entity: 'binary_sensor.window', kind: 'window' },
    { id: 'unassigned', room: 'office', icon: 'office', name: 'Noch zuordnen', position: { x: 350, y: 140 } },
    { id: 'outdoor', room: 'kitchen', icon: 'climate', name: 'Außenthermometer', position: { x: -30, y: 300 }, entity: 'sensor.outdoor', kind: 'temperature' },
  ],
  people: ['person.alex', 'person.sam'], weather: 'weather.home', calendars: ['calendar.family'],
  shopping: { entity: 'todo.family_shopping', name: 'Einkaufsliste' },
  ventilation: { outdoor_sources: [
    { name: 'Westseite', temperature: 'sensor.outdoor', humidity: 'sensor.outdoor_humidity' },
    { name: 'Ostseite', temperature: 'sensor.outdoor_east', humidity: 'sensor.outdoor_east_humidity' },
  ] },
  laundry: [
    { id: 'washer', name: 'Waschmaschine', power: 'sensor.washer_power', status: 'input_select.washer_phase', last_finished: 'input_datetime.washer_finished' },
    { id: 'dryer', name: 'Trockner', power: 'sensor.dryer_power', status: 'input_select.dryer_phase', last_finished: 'input_datetime.dryer_finished' },
  ],
  cleaning: { entity: 'vacuum.robot', battery: 'sensor.robot_battery', map: 'camera.robot_map', maintenance: [
    { name: 'Filter', percent: 'sensor.robot_filter_left', remaining: 'sensor.robot_filter_time' },
    { name: { en: 'Main brush', de: 'Hauptbürste' }, percent: 'sensor.robot_brush_left', remaining: 'sensor.robot_brush_time' },
  ] },
  monitors: [{ entity: 'sensor.device_battery', battery_below: 20 }],
  admin: { internet: ['binary_sensor.internet'], host: ['sensor.panel_cpu', 'sensor.panel_temperature'], clients: ['device_tracker.tablet'] },
};
export const previewHass = {
  services: { vacuum: { start: {}, pause: {}, stop: {}, return_to_base: {} }, todo: { add_item: {}, update_item: {} } },
  locale: { language: 'de' }, config: { time_zone: 'Europe/Berlin' }, themes: { darkMode: false },
  states: {
    'todo.family_shopping': { state: '3', attributes: { friendly_name: 'Einkaufsliste', supported_features: 119 } },
    'binary_sensor.window': { state: 'off', attributes: { device_class: 'window' } },
    'sensor.outdoor': { state: '12.4', attributes: { unit_of_measurement: '°C' }, last_updated: new Date().toISOString() },
    'sensor.outdoor_humidity': { state: '70', attributes: { unit_of_measurement: '%' }, last_updated: new Date().toISOString() },
    'sensor.outdoor_east': { state: 'unavailable', attributes: { unit_of_measurement: '°C' } },
    'sensor.outdoor_east_humidity': { state: 'unavailable', attributes: { unit_of_measurement: '%' } },
    'sensor.washer_power': { state: '0', attributes: { unit_of_measurement: 'W' } },
    'sensor.dryer_power': { state: '850', attributes: { unit_of_measurement: 'W' } },
    'input_select.washer_phase': { state: 'finished', attributes: {} },
    'input_select.dryer_phase': { state: 'running', attributes: {} },
    'input_datetime.washer_finished': { state: '2026-10-17 17:30:00', attributes: {} },
    'sun.sun': { state: 'above_horizon', attributes: { elevation: 24 } },
    ...Object.fromEntries(rooms.flatMap((room, index) => [
      [room.temperature, { state: [21.1, 22.8, 22.5, 19.6, 21.4, 20.2][index].toString(), attributes: { unit_of_measurement: '°C' }, last_updated: new Date().toISOString() }],
      [room.humidity, { state: [61.1, 54.9, 58.5, 42, 63, 49][index].toString(), attributes: { unit_of_measurement: '%' }, last_updated: new Date().toISOString() }],
      [room.lights[0], { state: index % 2 === 0 ? 'on' : 'off', attributes: { friendly_name: ['Wohn- und Essbereich', 'Arbeitszimmer', 'Küche', 'Schlafzimmer', 'Badezimmer', 'Flur'][index] } }],
      ...Object.values(room.cleaning).map(id => [id, { state: id.startsWith('script.') ? 'off' : '2026-10-17T08:00:00+00:00', attributes: {} }]),
    ])),
    'person.alex': { state: 'home', attributes: { friendly_name: 'Alex' } },
    'person.sam': { state: 'not_home', attributes: { friendly_name: 'Sam' } },
    'weather.home': { state: 'sunny', attributes: { temperature: 18, temperature_unit: '°C' } },
    'calendar.family': { state: 'off', attributes: { message: 'Abendessen mit Freunden', start_time: '2026-10-17T19:00:00+02:00' } },
    'vacuum.robot': { state: 'docked', attributes: { friendly_name: 'Fürst Saugfried von Flusenfels', supported_features: 8220 } },
    'sensor.robot_battery': { state: '92', attributes: { unit_of_measurement: '%' } },
    'sensor.robot_filter_left': { state: '1', attributes: { unit_of_measurement: '%' } },
    'sensor.robot_filter_time': { state: '1', attributes: { unit_of_measurement: 'h' } },
    'sensor.robot_brush_left': { state: '50', attributes: { unit_of_measurement: '%' } },
    'sensor.robot_brush_time': { state: '151', attributes: { unit_of_measurement: 'h' } },
    'sensor.device_battery': { state: '85', attributes: {} },
    'binary_sensor.internet': { state: 'on', attributes: { friendly_name: 'Internet' } },
    'sensor.panel_cpu': { state: '24', attributes: { friendly_name: 'CPU-Auslastung', unit_of_measurement: '%' } },
    'sensor.panel_temperature': { state: '49', attributes: { friendly_name: 'CPU-Temperatur', unit_of_measurement: '°C' } },
    'device_tracker.tablet': { state: 'home', attributes: { friendly_name: 'Wand-Tablet' } },
  },
};

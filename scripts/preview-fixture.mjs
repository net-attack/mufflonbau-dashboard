// Synthetic installation shared by screenshots and browser integration checks.
const rooms = [
  ['living', 'Living room', 'Wohnzimmer', 22.4, 46],
  ['kitchen', 'Kitchen', 'Küche', 21.8, 51],
  ['bedroom', 'Bedroom', 'Schlafzimmer', 19.6, 42],
  ['office', 'Office', 'Arbeitszimmer', 22.1, 44],
].map(([id, en, de], index) => ({ id, name: { en, de }, temperature: `sensor.${id}_temperature`, humidity: `sensor.${id}_humidity`, lights: [`light.${id}`], position: { x: index % 2 * 320, y: Math.floor(index / 2) * 200, width: 300, height: 180 } }));
export const previewConfig = {
  type: 'custom:mufflonbau', title: 'Mufflonbau', language: 'de', appearance: { mode: 'ambient' }, rooms,
  people: ['person.alex', 'person.sam'], weather: 'weather.home', calendars: ['calendar.family'],
  cleaning: { entity: 'vacuum.robot', battery: 'sensor.robot_battery' },
  monitors: [{ entity: 'sensor.device_battery', battery_below: 20 }],
};
export const previewHass = {
  locale: { language: 'de' }, config: { time_zone: 'Europe/Berlin' }, themes: { darkMode: false },
  states: {
    ...Object.fromEntries(rooms.flatMap((room, index) => [
      [room.temperature, { state: [22.4, 21.8, 19.6, 22.1][index].toString(), attributes: { unit_of_measurement: '°C' } }],
      [room.humidity, { state: [46, 51, 42, 44][index].toString(), attributes: { unit_of_measurement: '%' } }],
      [room.lights[0], { state: index % 2 === 0 ? 'on' : 'off', attributes: { friendly_name: ['Wohnzimmer', 'Küche', 'Schlafzimmer', 'Arbeitszimmer'][index] } }],
    ])),
    'person.alex': { state: 'home', attributes: { friendly_name: 'Alex' } },
    'person.sam': { state: 'not_home', attributes: { friendly_name: 'Sam' } },
    'weather.home': { state: 'sunny', attributes: { temperature: 18, temperature_unit: '°C' } },
    'calendar.family': { state: 'off', attributes: { message: 'Abendessen mit Freunden', start_time: '2026-10-17T19:00:00+02:00' } },
    'vacuum.robot': { state: 'docked', attributes: { friendly_name: 'Saugfried' } },
    'sensor.robot_battery': { state: '92', attributes: { unit_of_measurement: '%' } },
    'sensor.device_battery': { state: '85', attributes: {} },
  },
};

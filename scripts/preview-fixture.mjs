// Synthetic installation shared by screenshots and browser integration checks.
const rooms = [
  ['living', 'Living and dining', 'Wohn- und Essbereich', 21.1, 61.1],
  ['office', 'Office', 'Arbeitszimmer', 22.8, 54.9],
  ['kitchen', 'Kitchen', 'Küche', 22.5, 58.5],
  ['bedroom', 'Bedroom', 'Schlafzimmer', 19.6, 42],
  ['bathroom', 'Bathroom', 'Badezimmer', 21.4, 63],
  ['hall', 'Hall', 'Flur', 20.2, 49],
].map(([id, en, de], index) => ({ id, name: { en, de }, temperature: `sensor.${id}_temperature`, humidity: `sensor.${id}_humidity`, lights: [`light.${id}`], position: { x: index % 2 * 320, y: Math.floor(index / 2) * 200, width: 300, height: 180 } }));
export const previewConfig = {
  type: 'custom:mufflonbau', title: 'Mufflonbau', language: 'de', appearance: {}, rooms,
  people: ['person.alex', 'person.sam'], weather: 'weather.home', calendars: ['calendar.family'],
  cleaning: { entity: 'vacuum.robot', battery: 'sensor.robot_battery' },
  monitors: [{ entity: 'sensor.device_battery', battery_below: 20 }],
};
export const previewHass = {
  locale: { language: 'de' }, config: { time_zone: 'Europe/Berlin' }, themes: { darkMode: false },
  states: {
    'sun.sun': { state: 'above_horizon', attributes: { elevation: 24 } },
    ...Object.fromEntries(rooms.flatMap((room, index) => [
      [room.temperature, { state: [21.1, 22.8, 22.5, 19.6, 21.4, 20.2][index].toString(), attributes: { unit_of_measurement: '°C' } }],
      [room.humidity, { state: [61.1, 54.9, 58.5, 42, 63, 49][index].toString(), attributes: { unit_of_measurement: '%' } }],
      [room.lights[0], { state: index % 2 === 0 ? 'on' : 'off', attributes: { friendly_name: ['Wohn- und Essbereich', 'Arbeitszimmer', 'Küche', 'Schlafzimmer', 'Badezimmer', 'Flur'][index] } }],
    ])),
    'person.alex': { state: 'home', attributes: { friendly_name: 'Alex' } },
    'person.sam': { state: 'not_home', attributes: { friendly_name: 'Sam' } },
    'weather.home': { state: 'sunny', attributes: { temperature: 18, temperature_unit: '°C' } },
    'calendar.family': { state: 'off', attributes: { message: 'Abendessen mit Freunden', start_time: '2026-10-17T19:00:00+02:00' } },
    'vacuum.robot': { state: 'docked', attributes: { friendly_name: 'Fürst Saugfried von Flusenfels' } },
    'sensor.robot_battery': { state: '92', attributes: { unit_of_measurement: '%' } },
    'sensor.device_battery': { state: '85', attributes: {} },
  },
};

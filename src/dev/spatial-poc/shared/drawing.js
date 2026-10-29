import { scene, lightColor } from './model.js';
import { profileDrawing } from './profile.js';
// Renderer-neutral geometry, grouped by semantic object. SVG and Pixi interpret
// these primitives independently; neither renderer rasterizes the other's output.
export function drawing(state, p) {
  if (scene.profile) return profileDrawing(state, p);
  const rect = (x, y, w, h, fill, r = 0, stroke = p.wall, sw = 2) => ({ type: 'rect', x, y, w, h, r, fill, stroke, sw });
  const circle = (x, y, r, fill, stroke = p.wall, sw = 2) => ({ type: 'circle', x, y, r, fill, stroke, sw });
  const line = (points, stroke = p.wall, sw = 2) => ({ type: 'line', points, stroke, sw });
  const text = (x, y, value, size = 11, fill = p.ink) => ({ type: 'text', x, y, value, size, fill });
  const { room, objects: { sofa, table } } = scene;
  const blueprint = state.theme === 'blueprint';
  return [
    { id: 'room', layer: 'RoomLayer', shapes: [rect(room.x, room.y, room.width, room.height, p.floor, 18, p.wall, 5),
      ...Array.from({ length: 16 }, (_, i) => line([[60 + i * 31, 65], [60 + i * 31, 351]], p.grid, .7)),
      ...(blueprint ? Array.from({ length: 10 }, (_, i) => line([[60, 66 + i * 31], [540, 66 + i * 31]], p.grid, .7)) : []),
      text(165, 76, blueprint ? 'SEKTOR 01 / WOHNEN' : 'Das kleine Wohnzimmer', 12),
      text(300, 394, blueprint ? 'SPATIAL LAB  /  01:01  /  SIMULATION' : 'Ein bisschen Alltag. Ein bisschen Raumgefühl.', 11, p.muted)] },
    { id: 'rug', layer: 'FurnitureLayer', shapes: [rect(246, 160, 121, 107, p.rug, 30, p.rug),
      ...[0, 1, 2, 3].map(i => line([[255, 180 + i * 22], [358, 180 + i * 22]], p.floor, 1))] },
    { id: 'sofa', layer: 'FurnitureLayer', shapes: [rect(sofa.x, sofa.y, sofa.width, sofa.height, p.furniture, 22),
      rect(108, 133, 92, 47, p.cushion, 12), rect(108, 184, 92, 49, p.cushion, 12),
      rect(201, 133, 20, 101, p.furniture, 9), line([[111, 244], [111, 254]], p.wall, 4), line([[211, 244], [211, 254]], p.wall, 4),
      text(162, 274, 'LESEN & ANKOMMEN', 9, p.muted)] },
    { id: 'table', layer: 'FurnitureLayer', shapes: [rect(table.x, table.y + 4, table.width, table.height, p.wall, 23, p.wall, 0),
      rect(table.x, table.y, table.width, table.height, p.wood, 23), circle(286, 204, 8, p.device, p.device),
      line([[294, 200], [299, 200], [299, 207], [294, 207]], p.device, 2), rect(306, 216, 18, 21, p.cushion, 2, p.wall, 1)] },
    { id: 'dock', layer: 'FurnitureLayer', shapes: [rect(79, 312, 50, 25, p.wood, 7), line([[88, 322], [120, 322]], p.wall, 3), text(104, 350, 'SAUGFRIEDS PLATZ', 9, p.muted)] },
    { id: 'window', layer: 'DeviceLayer', shapes: [rect(263, 42, 74, 12, p.cool, 1, p.floor, 3),
      line(state.window.state === 'open' ? [[265, 48], [282, 22], [314, 22], [335, 48]] : [[265, 48], [335, 48]], p.cool, 4),
      text(300, 16, state.window.state === 'open' ? 'FENSTER OFFEN' : 'FENSTER ZU', 10, p.muted)] },
    { id: 'heating', layer: 'DeviceLayer', shapes: [rect(442, 65, 60, 29, p.device, 6, state.heating.active ? p.heat : p.wall),
      ...[0, 1, 2, 3, 4, 5].map(i => line([[450 + i * 9, 71], [450 + i * 9, 87]], state.heating.active ? p.heat : p.muted, 3)),
      text(472, 112, `${state.heating.active ? 'SOLL' : 'AUS'} · ${state.heating.targetTemperature.toFixed(1)} °C`, 9, p.muted)] },
    { id: 'light', layer: 'DeviceLayer', shapes: [circle(410, 139, 24, state.light.active ? lightColor(state) : p.device),
      circle(410, 139, 13, p.device, p.wall, 1.5), line([[404, 146], [416, 146]], p.wall, 2), line([[407, 151], [413, 151]], p.wall, 2),
      text(410, 182, state.light.active ? `${Math.round(state.light.brightness * 100)} % LICHT` : 'LICHT AUS', 10)] },
    { id: 'dehumidifier', layer: 'DeviceLayer', shapes: [rect(468, 252, 42, 55, p.device, 11),
      ...[0, 1, 2, 3].map(i => line([[477, 263 + i * 5], [501, 263 + i * 5]], p.muted, 1.5)),
      circle(489, 293, 3, state.dehumidifier.state === 'running' ? p.cool : p.muted, p.device, 1),
      text(489, 329, state.dehumidifier.state === 'running' ? 'ENTFEUCHTET' : 'BEREIT', 9, p.muted)] },
    { id: 'temperature', layer: 'DeviceLayer', shapes: [rect(248, 86, 54, 37, p.device, 10, p.line, 1),
      text(275, 102, `${state.temperature.value.toFixed(1)}°`, 15), text(275, 115, 'TEMPERATUR', 6.5, p.muted)] },
    { id: 'humidity', layer: 'DeviceLayer', shapes: [rect(315, 86, 54, 37, p.device, 10, p.line, 1),
      text(342, 102, `${state.humidity.value} %`, 15), text(342, 115, 'LUFTFEUCHTE', 6.5, p.muted)] },
    { id: 'vacuum', layer: 'DeviceLayer', moving: true, shapes: [circle(0, 3, 23, p.wall, p.wall, 0),
      circle(0, 0, 22, p.device, state.vacuum.state === 'error' ? '#db5c58' : p.wall, 2.5),
      circle(0, -6, 7, blueprint ? p.cool : p.cushion, p.wall, 1),
      ...(blueprint ? [line([[-13, 5], [13, 5]], p.cool, 1), circle(0, 0, 16, 'none', p.cool, .6)] : [circle(-6, 5, 2, p.ink, p.ink, 0), circle(6, 5, 2, p.ink, p.ink, 0), line([[-4, 11], [0, 13], [4, 11]], p.ink, 1.5)]),
      text(0, -30, state.vacuum.state === 'error' ? 'HILFE!' : blueprint ? 'UNIT S-01' : 'Saugfried', 10, state.vacuum.state === 'error' ? '#db5c58' : p.ink),
      text(0, 38, `${state.vacuum.state.toUpperCase()} · ${state.vacuum.battery}%`, 8, p.muted)] },
  ];
}

import { themes } from '../../../design/tokens.js';
const story = themes.storybook.ambient;
export const palettes = {
  storybook: { page: story.canvas, panel: '#fffdf5', ink: story.ink, muted: '#647569', line: '#cecbb8', accent: '#526e52',
    floor: '#f1e6d1', wall: '#5a6958', furniture: '#91a78c', cushion: '#c8d4b5', wood: '#c69565', rug: '#d4baa0', device: '#faf5e9', cool: '#5a929a', heat: '#c67c4f', grid: '#e5d8c1' },
  blueprint: { page: '#091522', panel: '#101f30', ink: '#d8eff3', muted: '#95b4c4', line: '#2b485e', accent: '#83e2df',
    floor: '#10283b', wall: '#8fd7e1', furniture: '#1a3b4d', cushion: '#284c5b', wood: '#345463', rug: '#142f43', device: '#19394b', cool: '#75ddf2', heat: '#f2ae73', grid: '#1b394e' },
};
export function applyTheme(node, theme) {
  node.dataset.theme = theme;
  for (const [key, value] of Object.entries(palettes[theme])) node.style.setProperty(`--poc-${key}`, value);
}

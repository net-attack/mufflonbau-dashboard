import { storybookWallpaper } from './illustration.js';
const calm = {
  ambient: { canvas: '#f4f3ee', surface: '#ffffff', soft: '#f0f1e9', ink: '#252b25', muted: '#72796c', line: '#e5e7dc', accent: '#53704b', active: '#e5eddb', hero: '#e9eddf', wallpaper: 'none' },
  night: { canvas: '#171d19', surface: '#222b24', soft: '#2a342b', ink: '#eef1e7', muted: '#a7b29f', line: '#354136', accent: '#b6d29a', active: '#3b5033', hero: '#2c3c2c', wallpaper: 'none' },
};
export const themes = {
  calm,
  atmospheric: {
    ambient: { canvas: '#e5ecee', surface: '#f9fcfce6', soft: '#e7eef0', ink: '#202d35', muted: '#586d76', line: '#cad6dd', accent: '#506e90', active: '#e5e4fb', hero: '#ffffff0a', wallpaper: 'radial-gradient(ellipse at 65% 50%,#a7c5d980,transparent 65%),radial-gradient(ellipse at 25% 10%,#c9c0df90,transparent 55%)' },
    night: { canvas: '#111820', surface: '#1e2933d9', soft: '#2b3741', ink: '#eef4f6', muted: '#afc4cc', line: '#3c4b58', accent: '#d2c5ff', active: '#37354e', hero: '#ffffff00', wallpaper: 'radial-gradient(ellipse at 60% 65%,#49728b80,transparent 62%),radial-gradient(ellipse at 35% 0%,#4a647680,transparent 55%),linear-gradient(145deg,#10131880,#13202b80)' },
  },
  storybook: {
    ambient: { canvas: '#eee9dc', surface: '#fffdf5ed', soft: '#f0ecdc', ink: '#344a40', muted: '#687b68', line: '#d9dcc8', accent: '#627f62', active: '#e9ddb5', hero: '#fffdf56b', wallpaper: storybookWallpaper },
    night: { canvas: '#172c2b', surface: '#223a38ed', soft: '#2e4640', ink: '#f3ecdb', muted: '#c0c9b1', line: '#4e6355', accent: '#e8c981', active: '#4d5940', hero: '#233a376b', wallpaper: `linear-gradient(#112c2acc,#112c2acc),${storybookWallpaper}` },
  },
};
export const palettes = themes.calm;
export function themeProperties(mode, theme = 'atmospheric') {
  const palette = (themes[theme] ?? themes.atmospheric)[mode] ?? themes.atmospheric.ambient;
  return { ...Object.fromEntries(Object.entries(palette).map(([key, value]) => [`--mb-${key}`, value])),
    '--primary-background-color': palette.canvas, '--secondary-background-color': palette.soft,
    '--card-background-color': palette.surface, '--ha-card-background': palette.surface,
    '--primary-text-color': palette.ink, '--secondary-text-color': palette.muted,
    '--divider-color': palette.line, '--ha-card-border-color': palette.line,
    '--primary-color': palette.accent, '--accent-color': palette.accent,
    '--ha-card-border-radius': '24px', '--ha-card-border-width': '1px', '--ha-card-box-shadow': '0 12px 32px #0000000d',
    '--state-light-active-color': palette.accent, '--state-switch-active-color': palette.accent,
  };
}
export function applyTheme(node, mode, theme) {
  node.setAttribute('data-theme', theme ?? 'atmospheric');
  for (const [key, value] of Object.entries(themeProperties(mode, theme))) node.style.setProperty(key, value);
}

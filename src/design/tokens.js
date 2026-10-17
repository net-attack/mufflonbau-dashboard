// Shared tokens also override native HA cards inside the dashboard shell.
export const palettes = {
  ambient: { canvas: '#f4f3ee', surface: '#ffffff', soft: '#f0f1e9', ink: '#252b25', muted: '#72796c', line: '#e5e7dc', accent: '#53704b', active: '#e5eddb', hero: '#e9eddf' },
  night: { canvas: '#171d19', surface: '#222b24', soft: '#2a342b', ink: '#eef1e7', muted: '#a7b29f', line: '#354136', accent: '#b6d29a', active: '#3b5033', hero: '#2c3c2c' },
};
export function themeProperties(mode) {
  const palette = palettes[mode] ?? palettes.ambient;
  return { ...Object.fromEntries(Object.entries(palette).map(([key, value]) => [`--mb-${key}`, value])),
    '--primary-background-color': palette.canvas, '--secondary-background-color': palette.soft,
    '--card-background-color': palette.surface, '--ha-card-background': palette.surface,
    '--primary-text-color': palette.ink, '--secondary-text-color': palette.muted,
    '--divider-color': palette.line, '--ha-card-border-color': palette.line,
    '--primary-color': palette.accent, '--accent-color': palette.accent,
    '--ha-card-border-radius': '24px', '--ha-card-border-width': '1px', '--ha-card-box-shadow': 'none',
    '--state-light-active-color': palette.accent, '--state-switch-active-color': palette.accent,
  };
}
export function applyTheme(node, mode) {
  for (const [key, value] of Object.entries(themeProperties(mode))) node.style.setProperty(key, value);
}

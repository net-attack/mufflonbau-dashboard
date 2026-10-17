import atlas from '../assets/saugfried-atlas.png';
import { element } from './dom.js';

// CSS viewports select the original artwork; the supplied atlas stays unedited.
const sprites = {
  greeting: [0, 10, 502, 363], campaign: [500, 5, 432, 370], riding: [930, 0, 510, 400],
  resting: [0, 378, 423, 214], puzzled: [621, 397, 152, 180],
  crest: [855, 600, 239, 212], castle: [1134, 600, 240, 203],
  name: [0, 731, 680, 202], title: [681, 781, 579, 142], dust: [47, 598, 261, 157],
};

export function saugfriedArt(kind, className = '') {
  const [x, y, width, height] = sprites[kind] ?? sprites.greeting;
  const frame = element('span', undefined, `saugfried-art ${className}`);
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = `aspect-ratio:${width}/${height};--sprite-width:${1448 / width * 100}%;--sprite-left:${-x / width * 100}%;--sprite-top:${-y / height * 100}%`;
  const img = element('img'); img.src = atlas; img.alt = ''; img.draggable = false; img.width = 1448; img.height = 1086;
  frame.append(img); return frame;
}

export function applyFlusenfelsTheme(node, mode) {
  const palette = mode === 'night'
    ? { canvas: '#192c28', surface: '#253b32', soft: '#30463b', ink: '#fff0cc', muted: '#d2c6a0', line: '#6c6848', accent: '#f0d083', active: '#505333' }
    : { canvas: '#eee5cf', surface: '#fff8e6', soft: '#f3ead3', ink: '#2f483b', muted: '#686044', line: '#cabe98', accent: '#6b4d1c', active: '#ead9a9' };
  for (const [key, value] of Object.entries(palette)) node.style.setProperty(`--mb-${key}`, value);
  for (const [key, value] of Object.entries({ '--primary-background-color': palette.canvas, '--card-background-color': palette.surface,
    '--ha-card-background': palette.surface, '--primary-text-color': palette.ink, '--secondary-text-color': palette.muted,
    '--divider-color': palette.line, '--primary-color': palette.accent })) node.style.setProperty(key, value);
  node.style.setProperty('--mb-wallpaper', 'radial-gradient(ellipse at 15% 0%,#ba9b4940,transparent 55%),radial-gradient(ellipse at 90% 100%,#647e5833,transparent 55%)');
}

export const saugfriedArtStyles = `
.saugfried-art{position:relative;display:block;overflow:hidden;flex:none;isolation:isolate}
.saugfried-art img{position:absolute;display:block;max-width:none;width:var(--sprite-width);height:auto;left:var(--sprite-left);top:var(--sprite-top);pointer-events:none;user-select:none}
`;

export const flusenfelsCardStyles = `
${saugfriedArtStyles}
.panel.flusenfels{position:relative;overflow:hidden;gap:16px;padding:22px;border:1px solid var(--mb-line);border-radius:24px;box-shadow:inset 0 0 0 5px var(--mb-soft),0 12px 28px #162c1912;background:radial-gradient(ellipse at top right,#d2af4a16,transparent 70%),var(--mb-surface)}
.flusenfels-hero{display:grid;grid-template-columns:minmax(90px,.9fr) minmax(0,1.6fr);gap:12px;align-items:center;min-width:0}
.flusenfels-hero .portrait{width:100%;max-width:190px;justify-self:center;filter:drop-shadow(0 8px 6px #302b1520)}
.royal-identity{min-width:0;text-align:center}.royal-identity .wordmark{width:100%;max-width:350px;margin:0 auto;clip-path:polygon(0 20%,39% 20%,43% 0,58% 0,62% 20%,100% 20%,100% 100%,0 100%)}.royal-identity .title-mark{width:95%;max-width:300px;margin:-5px auto 0}
.flusenfels .royal-motto{font-size:12px;line-height:1.5;color:var(--mb-muted);margin:8px 0 0;font-style:italic;font-family:Georgia,serif}
.royal-status{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--mb-soft);border:1px solid var(--mb-line);border-radius:15px}.royal-status .crest{width:40px}.royal-status-copy{min-width:0}.royal-status strong{font-family:Georgia,serif;font-size:18px;font-weight:600}.royal-status p{margin:4px 0 0;color:var(--mb-muted);font-size:11px;line-height:1.5}
.flusenfels .meta{font-size:12px}.flusenfels .running-mode strong{font-family:Georgia,serif;font-size:20px}.flusenfels .room{border-radius:12px;min-height:58px}.flusenfels .room span{font-size:12px}.flusenfels .room svg{width:22px;height:22px}
.flusenfels .rooms-label{font-family:Georgia,serif;font-size:15px;color:var(--mb-ink)}.flusenfels .command{min-height:48px;font-size:11px;flex-wrap:wrap;gap:5px;padding:9px}.flusenfels .command span{text-align:center;line-height:1.4}.flusenfels .modes .command{border-radius:13px}.flusenfels .command[aria-pressed=true]{box-shadow:inset 0 -3px 0 var(--mb-accent)}
.flusenfels .actions{padding-bottom:2px}.flusenfels .feedback{margin-top:auto}.flusenfels .court-footer{display:flex;align-items:center;justify-content:center;gap:10px;padding-top:12px;border-top:1px solid var(--mb-line);color:var(--mb-muted);font:italic 12px Georgia,serif}.court-footer .dust{width:48px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:900px){.panel.flusenfels{padding:16px;gap:12px}.flusenfels-hero{gap:4px}.flusenfels .royal-motto{font-size:11px}.flusenfels .command{font-size:10px;padding:7px 5px}.flusenfels .room span{font-size:11px}}
@media(prefers-reduced-motion:no-preference){.flusenfels .portrait{animation:royal-arrival .4s ease-out}@keyframes royal-arrival{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}}
`;

export const flusenfelsShellStyles = `
${saugfriedArtStyles}
:host([data-cleaning-theme=flusenfels]) .heading{font-family:Georgia,serif;font-weight:500;letter-spacing:-.8px}
:host([data-cleaning-theme=flusenfels]) .slot.cleaning{grid-column:span 5}
:host([data-cleaning-theme=flusenfels]) .slot.cleaning-map{grid-column:span 7;height:auto;min-height:430px;align-self:stretch;border:1px solid var(--mb-line);background:var(--mb-surface);box-shadow:inset 0 0 0 5px var(--mb-soft)}
.royal-map-title{position:absolute;top:0;left:0;right:0;height:58px;display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--mb-surface);border-bottom:1px solid var(--mb-line);font:18px Georgia,serif;z-index:2}
.royal-map-title .castle{width:38px}.slot.cleaning-map:has(.royal-map-title) .camera-viewport{padding-top:58px}.slot.cleaning-map:has(.royal-map-title) .camera-toolbar{top:70px}
.slot.cleaning-map > .royal-map-title{height:58px}
@media(orientation:portrait) and (max-width:1100px){:host([data-cleaning-theme=flusenfels]) .slot.cleaning,:host([data-cleaning-theme=flusenfels]) .slot.cleaning-map{grid-column:1/-1}}
@media(max-width:700px){:host([data-cleaning-theme=flusenfels]) .slot.cleaning,:host([data-cleaning-theme=flusenfels]) .slot.cleaning-map{grid-column:1/-1}:host([data-cleaning-theme=flusenfels]) .slot.cleaning-map{height:430px}}
`;

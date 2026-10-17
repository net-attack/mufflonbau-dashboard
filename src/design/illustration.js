// Original vector scenery: bundled locally, with no third-party image requests.
const trees = Array.from({ length: 16 }, (_, index) => {
  const x = index * 105 - 30;
  const y = 760 + index % 3 * 22;
  return `<g transform="translate(${x} ${y})" opacity=".55"><path d="M0 0 30-88 60 0H42v28H20V0Z" fill="${index % 2 ? '#91aaa0' : '#b2c3ab'}"/></g>`;
}).join('');
const houses = [
  [140, 134, '#cfb274', 'M0 0 48-45 96 0'], [242, 152, '#a6bdc1', 'M0 0 48-60 96 0'],
  [344, 115, '#c79988', 'M0 0 48-30 96 0'], [446, 184, '#88a98f', 'M0 0 48-68 96 0'],
  [548, 146, '#d2b785', 'M0 0 48-36 96 0'],
].map(([x, height, color, roof]) => `<g transform="translate(${x} ${875 - height})"><path d="${roof}" fill="${color}"/><rect width="96" height="${height}" fill="${color}" rx="2"/><path d="M34 ${height}v-48a14 14 0 0 1 28 0v48" fill="#f6ecd7"/>${[20, 62].flatMap(cx => [20, 62].map(cy => `<rect x="${cx}" y="${cy}" width="16" height="24" rx="7" fill="#f4e4ad"/><path d="M${cx + 8} ${cy}v24m-8-12h16" stroke="#fff8e9" stroke-width="2"/>`)).join('')}</g>`).join('');
const artwork = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">
<rect width="1600" height="1000" fill="#eee9dc"/>
<circle cx="1400" cy="160" r="65" fill="#ead599" opacity=".5"/>
<g fill="#faf7ef" opacity=".8"><ellipse cx="240" cy="115" rx="105" ry="21"/><ellipse cx="290" cy="101" rx="45" ry="25"/><ellipse cx="1160" cy="280" rx="90" ry="22"/><ellipse cx="1190" cy="263" rx="40" ry="29"/></g>
<g transform="translate(1285 360)"><ellipse cy="-60" rx="42" ry="55" fill="#b8c9b4"/><path d="M0-115C-25-80-25-43 0-5M0-115C25-80 25-43 0-5" fill="none" stroke="#e8e3cb" stroke-width="10"/><path d="m-20-13 9 27m31-27-9 27" stroke="#ad9981" stroke-width="2"/><rect x="-14" y="12" width="28" height="19" rx="4" fill="#c4a278"/></g>
<g transform="translate(1320 240) rotate(-15)"><ellipse rx="24" ry="14" fill="#dec477"/><path d="M-10-13v26M3-14v28" stroke="#6e735d" stroke-width="7"/><ellipse cx="-3" cy="-18" rx="10" ry="16" fill="#fffaf0" opacity=".8"/><circle cx="17" cy="-3" r="2" fill="#48574d"/></g>
<path d="M0 720Q280 570 600 750T1600 680V1000H0Z" fill="#d4ddc7"/><path d="M0 810Q400 710 740 810T1600 750V1000H0Z" fill="#b8cbb7"/>
${trees}${houses}
<path d="M0 935Q430 860 780 933T1600 900V1000H0Z" fill="#9ab7a7"/>
<g transform="translate(1320 970)"><path d="M-30 12q-90-8-96-44 66-8 86 23" fill="#c3936c"/><ellipse rx="42" ry="20" fill="#c3936c"/><path d="m20-12 9-29 16 24 18 15-30 20Z" fill="#c3936c"/><path d="m28-6 32 4-24 14Z" fill="#f3e8d5"/><circle cx="45" cy="-8" r="2.5" fill="#48574d"/><path d="m-22 9-6 27m40-27 6 27" stroke="#c3936c" stroke-width="9" stroke-linecap="round"/></g>
<g fill="#e5c77c"><path d="m450 350 3 8 9 1-7 5 2 9-7-5-7 5 2-9-7-5 9-1Z"/><path d="m1460 450 3 8 9 1-7 5 2 9-7-5-7 5 2-9-7-5 9-1Z"/></g>
</svg>`;
export const storybookWallpaper = `url("data:image/svg+xml,${encodeURIComponent(artwork)}")`;

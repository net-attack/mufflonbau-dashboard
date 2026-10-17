export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function svgElement(tag, attributes = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
const paths = {
  sofa: 'M4 12V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4M3 10a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 4 0v7H1v-7a2 2 0 0 1 2-2ZM4 19v2m16-2v2',
  bed: 'M3 18V5m18 13V9a2 2 0 0 0-2-2H9v8M3 15h18M3 18h18M7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  kitchen: 'M4 3h16v18H4zM4 10h16M8 5v3m0 5v4',
  office: 'M3 13h18M5 13v8m14-8v8M6 3h12v7H6zM10 10v3m4-3v3',
  nursery: 'M3 8h16l-3 9H6L3 5H1m6 16h.01M16 21h.01M5 8a6 6 0 0 1 12 0Z',
  home: 'm3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7',
  rooms: 'M3 3h18v18H3zM3 12h9V3M12 12h9M12 12v9',
  climate: 'M9 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0ZM12 8v10',
  cleaning: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM10 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM6 17h12M4.5 18.5 2 21m17.5-2.5L22 21',
  play: 'm8 5 12 7-12 7V5Z',
  stop: 'M6 6h12v12H6z',
  warning: 'M12 3 2.4 20.5h19.2L12 3Zm0 6.2v5.1m0 2.7h.01',
  system: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6',
  admin: 'M3 3h18v7H3zM3 14h18v7H3zM7 6h.01M7 17h.01M12 6h6M12 17h6',
  expert: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  light: 'M9 18h6m-6 3h6M8 13a6 6 0 1 1 8 0l-1 2H9l-1-2Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  sun: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  drop: 'M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12Z',
  person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  calendar: 'M4 5h16v16H4zM8 3v4m8-4v4M4 11h16',
};
export function icon(name = 'home') {
  const node = svgElement('svg', { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
  node.append(svgElement('path', { d: paths[name] ?? paths.rooms }));
  return node;
}
export function iconPath(name = 'home') { return paths[name] ?? paths.rooms; }
export function navigationUrl(path) {
  const url = new URL(window.location.href);
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length > 1) segments.pop();
  url.pathname = `/${segments.join('/')}/${path}`;
  url.hash = '';
  return url.pathname;
}
export function navigateLink(link, path) {
  link.setAttribute('href', navigationUrl(path));
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.pushState(null, '', navigationUrl(path));
    window.dispatchEvent(new Event('location-changed'));
  });
}

export function roomIcon(room) {
  const value = `${room.icon ?? ''} ${room.id}`.toLowerCase();
  if (/sofa|living|wohn/.test(value)) return 'sofa';
  if (/bed|schlaf/.test(value)) return 'bed';
  if (/kitchen|kuche|countertop/.test(value)) return 'kitchen';
  if (/office|desk|arbeit/.test(value)) return 'office';
  if (/baby|nursery|kinder/.test(value)) return 'nursery';
  return 'rooms';
}

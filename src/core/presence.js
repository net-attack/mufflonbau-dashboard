// Recorder-derived presence, using HA's local calendar days (including DST).
const minute = 60000;
export function presenceKind(state) {
  if (typeof state !== 'string' || !state.trim() || ['unknown', 'unavailable', 'NaN'].includes(state)) return 'unknown';
  return state === 'home' ? 'home' : 'away';
}
function localParts(time, zone) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(time).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
}
function midnight(date, zone) {
  const desired = Date.UTC(date.year, date.month - 1, date.day);
  let time = desired;
  for (let i = 0; i < 4; i++) {
    const p = localParts(time, zone);
    const shift = desired - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    if (!shift) break;
    time += shift;
  }
  return time;
}
export function presenceDays(now, zone = 'UTC') {
  const p = localParts(now, zone);
  const day = Date.UTC(p.year, p.month - 1, p.day);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(day - (6 - index) * 86400000);
    const start = midnight({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }, zone);
    const next = new Date(day - (5 - index) * 86400000);
    const end = Math.min(now, midnight({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() }, zone));
    return { start, end, home: 0, away: 0, unknown: 0 };
  });
}
function rowTime(row) {
  return row.lu !== undefined || row.lc !== undefined ? Number(row.lu ?? row.lc) * 1000 : Date.parse(row.last_updated ?? row.last_changed);
}
export function presenceStats(rows, live, now, zone = 'UTC') {
  const days = presenceDays(now, zone), start = days[0].start;
  const points = (rows ?? []).filter(row => row.s !== undefined || row.state !== undefined)
    .map(row => ({ time: rowTime(row), kind: presenceKind(row.s ?? row.state) }))
    .filter(point => Number.isFinite(point.time) && point.time <= now);
  // A live state is evidence only from its actual last change, never from midnight.
  const changed = Date.parse(live?.last_changed);
  if (Number.isFinite(changed) && changed <= now) points.push({ time: changed, kind: presenceKind(live?.state) });
  points.sort((a, b) => a.time - b.time);
  const segments = []; let cursor = start, kind = 'unknown', since = null, outings = 0;
  for (const point of points) {
    if (point.time > start) segments.push({ start: cursor, end: point.time, kind });
    if (point.kind !== kind) {
      if (point.time >= start && kind === 'home' && point.kind === 'away') outings++;
      since = point.time;
    }
    kind = point.kind; cursor = Math.max(start, point.time);
  }
  segments.push({ start: cursor, end: now, kind });
  for (const day of days) for (const segment of segments) {
    day[segment.kind] += Math.max(0, Math.min(day.end, segment.end) - Math.max(day.start, segment.start));
  }
  const latestAway = segments.filter(segment => segment.kind === 'away' && segment.end > segment.start).at(-1);
  const current = presenceKind(live?.state);
  const known = days.reduce((sum, day) => sum + day.home + day.away, 0);
  return { days, today: days.at(-1), known, outings: known ? outings : null,
    lastAway: latestAway?.end ?? null, current,
    since: current === kind ? since : Number.isFinite(changed) ? changed : null };
}
export function presenceDuration(ms, language) {
  if (ms === null || !Number.isFinite(ms)) return '—';
  const minutes = Math.max(0, Math.floor(ms / minute));
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

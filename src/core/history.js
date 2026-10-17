// Home Assistant's compact WebSocket history uses Unix seconds and s/lc/lu keys.
export function historyPoints(rows, start, end) {
  return (rows ?? []).map(row => {
    const time = Number(row.lu ?? row.lc) * 1000;
    const value = typeof row.s === 'string' && row.s.trim() !== '' ? Number(row.s) : NaN;
    return { time, value: Number.isFinite(value) ? value : null };
  }).filter(point => Number.isFinite(point.time) && point.time <= end)
    .sort((a, b) => a.time - b.time)
    .filter((point, index, points) => point.time >= start || index === points.length - 1 || points[index + 1].time >= start)
    .map(point => ({ ...point, time: Math.max(start, point.time) }));
}
export function historyPath(points, start, end, min, max, width = 700, height = 180) {
  let open = false;
  return points.map(point => {
    if (point.value === null) { open = false; return ''; }
    const x = ((point.time - start) / (end - start) * width).toFixed(2);
    const y = (height - (point.value - min) / (max - min || 1) * height).toFixed(2);
    const command = `${open ? 'L' : 'M'}${x},${y}`; open = true; return command;
  }).join(' ');
}
export async function fetchHistory(hass, ids, start, end) {
  if (!ids.length) return {};
  return hass.callWS({ type: 'history/history_during_period', start_time: new Date(start).toISOString(),
    end_time: new Date(end).toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true });
}

import { availability, numericState } from './state.js';

export const adminGroups = ['internet', 'network', 'host'];
const sourcePatterns = {
  internet: /speedtest|internet|wan|download|upload|ping|latency|external.?ip|connectivity|connection/i,
  network: /wlan|wifi|wi-fi|network|lan|wan|speedtest|download|upload|ping|internet|ssid|connection|client/i,
  host: /raspberry|raspi|\brpi\b|home.?assistant|processor|cpu|memory|ram|disk|swap|uptime/i,
};
export function discoverAdminSources(admin, states) {
  const result = Object.fromEntries([...adminGroups, 'clients'].map(key => [key, [...(admin[key] ?? [])]]));
  for (const [id, state] of Object.entries(states ?? {})) {
    const domain = id.split('.')[0];
    const name = `${id} ${state?.attributes?.friendly_name ?? ''} ${state?.attributes?.device_class ?? ''} ${state?.attributes?.integration ?? ''}`;
    if (adminGroups.includes(domain) || !['sensor', 'binary_sensor', 'device_tracker'].includes(domain)) continue;
    if (domain === 'device_tracker') {
      if (state?.attributes?.source_type === 'router' || /fritz|fritzbox|wlan|wifi|wi-fi/i.test(name)) result.clients.push(id);
      continue;
    }
    for (const group of adminGroups) {
      if (sourcePatterns[group].test(name)) result[group].push(id);
    }
  }
  for (const key of Object.keys(result)) result[key] = [...new Set(result[key])];
  return result;
}

export function normalizeAdmin(value, validateEntity) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Mufflonbau: admin must be an object.');
  const result = {};
  for (const key of [...adminGroups, 'clients']) {
    const ids = value[key] ?? [];
    if (!Array.isArray(ids)) throw new Error(`Mufflonbau: admin.${key} must be an array of entity IDs.`);
    ids.forEach((id, index) => {
      validateEntity(id, `admin.${key}[${index}]`);
      if (key === 'clients' && !id.startsWith('device_tracker.')) throw new Error(`Mufflonbau: admin.clients[${index}] must reference a device_tracker.`);
    });
    result[key] = [...new Set(ids)];
  }
  return result;
}

// Only router-backed trackers explicitly selected by the owner are counted.
// A GPS person's presence cannot establish Wi-Fi connectivity.
export function clientSummary(ids, states) {
  const summary = { connected: 0, away: 0, unknown: 0, total: ids.length };
  for (const id of ids) {
    const state = states[id];
    if (availability(state) !== 'available') summary.unknown++;
    else if (state.state === 'home') summary.connected++;
    else if (state.state === 'not_home') summary.away++;
    else summary.unknown++;
  }
  return summary;
}
export function numericGroups(ids, states) {
  const groups = new Map();
  for (const id of ids) {
    const state = states[id];
    // Retain recorded history when a numeric sensor is temporarily unavailable.
    if (numericState(state) === null && state?.attributes?.unit_of_measurement === undefined) continue;
    const unit = state.attributes?.unit_of_measurement ?? '';
    const kind = state.attributes?.device_class ?? '';
    const key = `${kind}\0${unit}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(id);
  }
  return [...groups.values()];
}

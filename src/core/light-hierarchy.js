export function roomLightHierarchy(room, states) {
  const configured = [...new Set(room.lights ?? [])];
  const members = new Set();
  for (const id of configured) {
    const children = states[id]?.attributes?.entity_id;
    if (!Array.isArray(children)) continue;
    for (const child of children) {
      if (typeof child === 'string' && configured.includes(child)) members.add(child);
    }
  }
  return { lights: configured.filter(id => !members.has(id)), members: configured.filter(id => members.has(id)) };
}

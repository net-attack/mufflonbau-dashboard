import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { load, YAML11_SCHEMA } from 'js-yaml';
import { normalizeConfig } from '../src/core/config.js';
import { generateDashboard } from '../src/strategy.js';

// Home Assistant frontend 20260930.3 (Core 2026.10.1) uses this schema.
const parse = yaml => load(yaml, { schema: YAML11_SCHEMA });
for (const file of await readdir(new URL('../examples/', import.meta.url))) {
  if (!file.endsWith('.yaml')) continue;
  test(`HA YAML parser loads examples/${file} into a valid dashboard`, async () => {
    const parsed = parse(await readFile(new URL(`../examples/${file}`, import.meta.url), 'utf8'));
    const config = parsed.strategy ?? parsed;
    assert.equal(config.type, 'custom:mufflonbau');
    // Examples must preserve the key rather than rely on legacy compatibility.
    for (const room of config.rooms ?? []) {
      if (room.position && !room.position.parts && !room.position.points) assert.equal(typeof room.position.y, 'number', 'Quote the YAML key "y" to prevent YAML 1.1 boolean conversion.');
    }
    const result = generateDashboard(config, { states: {}, locale: { language: 'de' } });
    assert.ok(result.views.length > 0);
    assert.ok(result.views.every(view => view.type && Array.isArray(view.cards)));
  });
}
test('recovers the y coordinate from configurations already saved through YAML 1.1', () => {
  const config = parse(`rooms:
  - id: living
    name: Living room
    position:
      x: 0
      y: 22
      width: 300
      height: 180
`);
  assert.equal(config.rooms[0].position.true, 22);
  const result = normalizeConfig(config);
  assert.deepEqual(result.rooms[0].position, { x: 0, y: 22, width: 300, height: 180 });
  assert.equal(config.rooms[0].position.y, undefined, 'Normalization must not mutate the input');
});
test('explicit y takes precedence and genuinely missing coordinates still fail', () => {
  const room = { id: 'living', name: 'Living room', position: { x: 0, y: 0, true: 22, width: 300, height: 180 } };
  assert.deepEqual(normalizeConfig({ rooms: [room] }).rooms[0].position, { x: 0, y: 0, width: 300, height: 180 });
  assert.throws(() => normalizeConfig({ rooms: [{ ...room, position: { x: 0, width: 300, height: 180 } }] }), /position.y/);
});

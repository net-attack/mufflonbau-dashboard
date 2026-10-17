import test from "node:test";
import assert from "node:assert/strict";

globalThis.HTMLElement = class {};
globalThis.window = {};
const registry = new Map();
globalThis.customElements = {
  get: (name) => registry.get(name),
  define: (name, value) => registry.set(name, value),
};
await import("../mufflonbau-dashboard.js");
const Strategy = registry.get("ll-strategy-dashboard-mufflonbau");

test("generates an empty dashboard without installation-specific entities", async () => {
  const result = await Strategy.generate({}, { states: {} });
  assert.equal(result.title, "Mufflonbau");
  assert.equal(result.views[0].path, "home");
  assert.match(result.views[0].cards[1].content, /Noch keine/);
});

test("includes available entities and reports missing ones", async () => {
  const result = await Strategy.generate({ title: "Mein Haus", entities: ["light.room", "sensor.missing"] }, {
    states: { "light.room": { state: "unavailable" } },
  });
  assert.equal(result.title, "Mein Haus");
  assert.deepEqual(result.views[0].cards[1].entities, ["light.room"]);
  assert.match(result.views[0].cards[2].content, /sensor.missing/);
});

test("rejects malformed entity configuration", async () => {
  await assert.rejects(Strategy.generate({ entities: "light.room" }, { states: {} }), /Liste/);
});

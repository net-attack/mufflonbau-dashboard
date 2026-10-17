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
  assert.equal(result.views[0].type, "masonry");
  assert.match(result.views[0].cards[1].content, /No available/);
});

test("includes available entities and reports missing ones", async () => {
  const result = await Strategy.generate({ title: "My Home", entities: ["light.room", "sensor.missing"] }, {
    states: { "light.room": { state: "unavailable" } },
  });
  assert.equal(result.title, "My Home");
  assert.deepEqual(result.views[0].cards[1].entities, ["light.room"]);
  assert.match(result.views[0].cards[2].content, /sensor.missing/);
});

test("rejects malformed entity configuration", async () => {
  await assert.rejects(Strategy.generate({ entities: "light.room" }, { states: {} }), /must be an array/);
});

for (const [language, home, overview, missing] of [
  ["en", "Home", "Overview", "Not found"],
  ["de", "Zuhause", "Übersicht", "Nicht gefunden"],
]) {
  test(`renders ${language} when explicitly configured, overriding the profile`, async () => {
    const result = await Strategy.generate({ language, entities: ["light.room", "sensor.missing"] }, {
      locale: { language: language === "de" ? "en" : "de" },
      states: { "light.room": {} },
    });
    assert.equal(result.views[0].title, home);
    assert.equal(result.views[0].cards[1].title, overview);
    assert.ok(result.views[0].cards[2].content.startsWith(missing));
  });
}

test("uses the profile language and supports regional variants", async () => {
  for (const profile of [{ locale: { language: "de-DE" } }, { language: "de" }]) {
    const result = await Strategy.generate({ language: "auto" }, { ...profile, states: {} });
    assert.equal(result.views[0].title, "Zuhause");
    assert.match(result.views[0].cards[0].content, /Willkommen/);
    assert.match(result.views[0].cards[1].content, /Noch keine/);
  }
});

test("falls back to English for unsupported profile languages", async () => {
  const result = await Strategy.generate({}, { locale: { language: "fr" }, states: {} });
  assert.equal(result.views[0].title, "Home");
  assert.match(result.views[0].cards[0].content, /Welcome/);
});

test("rejects unsupported explicit languages", async () => {
  await assert.rejects(Strategy.generate({ language: "fr" }, { states: {} }), /language must be/);
});

/** HACS entry point; dependency-free Home Assistant dashboard strategy. */
class MufflonbauDashboardStrategy extends HTMLElement {
  static getCreateSuggestions() {
    return { title: "Mufflonbau", icon: "mdi:home" };
  }

  static async generate(config, hass) {
    const entities = config.entities ?? [];
    if (!Array.isArray(entities) || entities.some((id) => typeof id !== "string")) {
      throw new Error("Mufflonbau: entities muss eine Liste von Entity-IDs sein.");
    }
    const available = entities.filter((id) => Object.hasOwn(hass.states, id));
    const missing = entities.filter((id) => !Object.hasOwn(hass.states, id));
    const cards = [{
      type: "markdown",
      content: "# Willkommen im Mufflonbau\n\nDein erweiterbares Home-Assistant-Dashboard.",
    }];
    if (available.length) {
      cards.push({ type: "entities", title: "Übersicht", entities: available });
    } else {
      cards.push({
        type: "markdown",
        content: "Noch keine verfügbaren Entitäten ausgewählt. Ergänze `entities` in der Dashboard-Strategie.",
      });
    }
    if (missing.length) {
      cards.push({ type: "markdown", content: `Nicht gefunden: ${missing.map((id) => `\`${id}\``).join(", ")}` });
    }
    return {
      title: config.title || "Mufflonbau",
      views: [{ title: "Zuhause", path: "home", icon: "mdi:home", cards }],
    };
  }
}

if (!customElements.get("ll-strategy-dashboard-mufflonbau")) {
  customElements.define("ll-strategy-dashboard-mufflonbau", MufflonbauDashboardStrategy);
}
window.customStrategies = window.customStrategies || [];
if (!window.customStrategies.some((strategy) => strategy.type === "mufflonbau")) {
  window.customStrategies.push({
    type: "mufflonbau",
    strategyType: "dashboard",
    name: "Mufflonbau",
    description: "Ein erweiterbares Dashboard für den Mufflonbau.",
    documentationURL: "https://github.com/netattack/mufflonbau-dashboard",
  });
}

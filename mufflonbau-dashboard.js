/** HACS entry point; dependency-free Home Assistant dashboard strategy. */
const translations = {
  en: {
    welcome: "# Welcome to Mufflonbau\n\nYour extensible Home Assistant dashboard.",
    overview: "Overview",
    empty: "No available entities selected yet. Add `entities` to the dashboard strategy.",
    missing: "Not found",
    home: "Home",
  },
  de: {
    welcome: "# Willkommen im Mufflonbau\n\nDein erweiterbares Home-Assistant-Dashboard.",
    overview: "Übersicht",
    empty: "Noch keine verfügbaren Entitäten ausgewählt. Ergänze `entities` in der Dashboard-Strategie.",
    missing: "Nicht gefunden",
    home: "Zuhause",
  },
};

function resolveLanguage(config, hass) {
  const language = config.language ?? "auto";
  if (!["auto", "de", "en"].includes(language)) {
    throw new Error('Mufflonbau: language must be "auto", "de", or "en".');
  }
  if (language !== "auto") return language;
  const profileLanguage = hass.locale?.language ?? hass.language ?? "en";
  return profileLanguage.toLowerCase().split(/[-_]/)[0] === "de" ? "de" : "en";
}

class MufflonbauDashboardStrategy extends HTMLElement {
  static getCreateSuggestions() {
    return { title: "Mufflonbau", icon: "mdi:home" };
  }

  static async generate(config, hass) {
    const text = translations[resolveLanguage(config, hass)];
    const entities = config.entities ?? [];
    if (!Array.isArray(entities) || entities.some((id) => typeof id !== "string")) {
      throw new Error("Mufflonbau: entities must be an array of entity IDs.");
    }
    const available = entities.filter((id) => Object.hasOwn(hass.states, id));
    const missing = entities.filter((id) => !Object.hasOwn(hass.states, id));
    const cards = [{
      type: "markdown",
      content: text.welcome,
    }];
    if (available.length) {
      cards.push({ type: "entities", title: text.overview, entities: available });
    } else {
      cards.push({
        type: "markdown",
        content: text.empty,
      });
    }
    if (missing.length) {
      cards.push({ type: "markdown", content: `${text.missing}: ${missing.map((id) => `\`${id}\``).join(", ")}` });
    }
    return {
      title: config.title || "Mufflonbau",
      views: [{ title: text.home, path: "home", icon: "mdi:home", cards }],
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
    description: "An extensible dashboard for Mufflonbau.",
    documentationURL: "https://github.com/net-attack/mufflonbau-dashboard",
  });
}

# Mufflonbau Dashboard

Erweiterbares Home-Assistant-Dashboard, vorbereitet als HACS-Frontend-Repository.
Das Grundgerüst erzeugt eine Startansicht mit frei wählbaren Entitäten.

**Stand:** lokal vorbereitet; Veröffentlichung und Prüfung in einer echten HA-Instanz stehen aus.

## Installation nach Veröffentlichung

Voraussetzungen: Home Assistant ab 2026.5 und HACS.

1. In HACS `https://github.com/netattack/mufflonbau-dashboard` als benutzerdefiniertes Repository vom Typ **Dashboard** hinzufügen.
2. Mufflonbau Dashboard herunterladen. Prüfen, ob die JavaScript-Modulressource eingetragen ist:
   `/hacsfiles/mufflonbau-dashboard/mufflonbau-dashboard.js`.
3. Browser neu laden. Ein Dashboard mit der Community-Strategie **Mufflonbau** erstellen.
   Alternativ ein leeres Dashboard anlegen und dessen Rohkonfiguration durch
   [examples/dashboard.yaml](examples/dashboard.yaml) ersetzen.
4. Unter `strategy.entities` eigene Entity-IDs ergänzen. Nicht vorhandene IDs werden angezeigt.

Die Strategie generiert die Ansichten. Dauerhafte Anpassungen erfolgen über ihre
Konfiguration beziehungsweise später über zusätzliche Module.
Keine weiteren Custom Cards und keine Python-Komponente erforderlich.

## Entwicklung

Node.js 22 oder neuer: `npm run check` und `npm test`. Keine npm-Abhängigkeiten.
Die Datei `mufflonbau-dashboard.js` ist zugleich Quellcode und HACS-Download.

Architektur, Meilensteine und offene Produktentscheidungen: [Ausbauplan](docs/PLAN.md).

## GitHub-Veröffentlichung

Ziel: öffentliches Repository `netattack/mufflonbau-dashboard`, Standardbranch `main`.
Beschreibung: „Erweiterbares Home-Assistant-Dashboard für den Mufflonbau via HACS“.
Topics: `home-assistant`, `hacs`, `dashboard`, `lovelace`.
Vor dem ersten Release Lizenz festlegen und Installation in Home Assistant prüfen.
Anschließend Version `v0.1.0` veröffentlichen; zunächst als benutzerdefiniertes
HACS-Repository verwenden. Aufnahme in den HACS-Standardkatalog ist ein eigener Schritt.

## Technische Referenzen

- [HACS Dashboard-Anforderungen](https://www.hacs.xyz/docs/publish/plugin/)
- [HACS Repository-Metadaten](https://www.hacs.xyz/docs/publish/start/)
- [Home Assistant Dashboard-Strategien](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-strategy/)

# Ausbauplan

## Ziel und Architektur

Mufflonbau wird ein responsives Dashboard innerhalb von Home Assistant und über
HACS aktualisiert. Start als JavaScript-Dashboard-Strategie: vorhandene HA-Karten
darstellen, vorhandene Entitäten verwenden, keine eigenen Zugangsdaten speichern.
Eine Backend-Integration wird erst benötigt, wenn neue Datenquellen oder eigene
Entitäten hinzukommen.

Die erste Konfiguration unterstützt `title` und `entities`. Entity-IDs sind explizit
konfiguriert; es gibt keine Annahmen über die Installation. Fehlende Entitäten
werden als Hinweis angezeigt. Verfügbarkeit und Bedienung übernimmt die native Karte.

## Meilensteine

1. **Grundlage:** GitHub-Repo erstellen und hochladen, HACS-Installation in HA testen,
   Lizenz wählen, erste Version veröffentlichen. Erledigt sind lokales Gerüst,
   Beispielkonfiguration und automatisierte Generierungstests.
2. **Startseite:** gewünschte Informationen und Geräte festlegen; Statusübersicht,
   Favoriten, Licht und Temperatur mit echten Entitäten konfigurieren.
3. **Räume:** modulare Ansichten je Raum; zunächst explizite Zuordnung, danach optional
   automatische Erkennung über HA-Bereiche. Manuelle Auswahl hat Vorrang.
4. **Energie und Klima:** Verbräuche, PV/Batterie und Heizung nur für vorhandene Sensoren;
   Einheiten, unavailable-Zustände und Historie berücksichtigen.
5. **Bedienung und Gestaltung:** Mobiltelefon, Tablet und Wanddisplay, HA-Themes,
   barrierearme Bedienung, optional grafischer Konfigurationseditor.
6. **Releases:** Versionskonvention, Änderungsprotokoll und HACS-Validierung ergänzen;
   Standardkatalog erst nach stabiler Nutzung anstreben.

Jedes neue Modul erhält eigene Konfiguration und eine klar begrenzte Aufgabe.
Wenn das Projekt wächst, Quellcode in `src/` aufteilen und ein einzelnes Bundle
nach `dist/mufflonbau-dashboard.js` bauen; HACS-Metadaten dann anpassen.

## Abnahme des ersten Releases

- HACS lädt das öffentliche Repository und die Ressource ohne Fehler.
- Strategie erscheint in HA und erzeugt eine nutzbare Startansicht.
- Leere Konfiguration, gültige und fehlende Entitäten funktionieren.
- Zustandsänderungen erscheinen in den nativen Karten.
- Mobilansicht und Aktualisierung auf eine neue Version wurden geprüft.

## Noch gemeinsam festzulegen

- Priorität: Räume, Energie, Sicherheit oder allgemeine Hausübersicht?
- Verfügbare Geräte, Entity-IDs und HA-Version.
- Hauptgerät: Smartphone, Tablet oder Wanddisplay; gewünschte Gestaltung.
- Lizenz vor dem ersten Release.

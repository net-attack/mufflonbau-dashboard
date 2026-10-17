# Dein eigenes Dashboard mit einem Agenten bauen

Du brauchst dieses Repository im Arbeitsverzeichnis deines Agenten und Mufflonbau
als Dashboard-Ressource in Home Assistant. Der Agent kann Räume, Klima, Licht,
Anwesenheit, Kalender, Reinigung und Systemprüfung für deine Installation
zusammenstellen. Es gibt zwei Wege: einen Datenexport zum Kopieren oder einen
direkten Zugriff über MCP.

## Weg A: Template kopieren, Ergebnis dem Agenten geben

1. Öffne in Home Assistant **Entwicklerwerkzeuge → Template**.
2. Kopiere den Inhalt von
   [diagnostics-template.jinja](../examples/diagnostics-template.jinja) hinein.
3. Ändere am Anfang `section = 'lights'` zu **`section = 'all'`**. Lass zunächst
   `offset = 0` und `page_size = 40` stehen.
4. Kopiere das JSON-Ergebnis in `debug/ha-all-0.local.json` oder direkt in deinen
   privaten Agenten-Chat.
5. Solange `has_more` wahr ist: Setze `offset` auf den zurückgegebenen Wert
   `next_offset`, führe das Template erneut aus und speichere die nächste Seite
   als `debug/ha-all-<offset>.local.json`. Verwende immer `next_offset`, weil eine
   große Entität eine Seite schon vor 40 Einträgen füllen kann.
6. Gib dem Agenten alle Seiten und den folgenden Auftrag:

```text
Lies skills/mufflonbau-dashboard/SKILL.md in diesem Repository und nutze
den beschriebenen Workflow. Meine vollständigen Exporte liegen unter
debug/ha-all-*.local.json.

Baue daraus mein persönliches Mufflonbau-Dashboard und speichere die fertige
Strategie in examples/my-dashboard.local.yaml. Nutze meine HA-Bereiche als Räume.
Prüfe die Quellen für Temperatur und Feuchtigkeit anhand der Geräte und
Integrationen. Stelle Rückfragen bei mehrdeutigen Quellen; arbeite mit den
eindeutigen Zuordnungen schon weiter. Erfinde keine Entitäten oder Raumaktionen.
Ein Grundriss liegt noch nicht vor, verwende zunächst die automatische Anordnung.
Prüfe die YAML und sage mir genau, in welchen HA-Editor ich sie kopieren soll.
Meine Exporte und persönliche Konfiguration dürfen nicht committed werden.
```

Ergänze deine Wünsche, beispielsweise Tablet oder Handy, bevorzugte Sensoren,
helles/dunkles Design, Namen der Räume und gewünschte Favoriten. Wenn du einen
Grundriss hast, kannst du ihn dem Agenten separat geben. Die Exportdateien
enthalten keine Raumgeometrie.

`all` erfasst alle Entitäten mit einem aktuellen Eintrag in HAs Zustandsliste,
darunter Personen, Kalender und Wetter. Enthalten sind IDs, Namen, Zustände,
Bereiche, Geräte, Integrationen und ausgewählte Fähigkeiten, etwa Lichtgruppen
und Auswahloptionen. Deaktivierte Entitäten ohne Zustand, komplette Script-
Abläufe und Service-Schemata fehlen. Für eine bestimmte Raumreinigung kann daher
noch ein gezielter Export der vorhandenen Script-/Gerätekonfiguration nötig sein.

Das Template liest nur Daten und führt keine Geräteaktionen aus. Es lässt unter
anderem Kamera-Zugriffstoken und GPS-Koordinaten als Attribute weg. Namen,
Anwesenheit, Sensorzustände und teilweise IP-/WLAN-Daten bleiben persönliche
Informationen; prüfe die Ausgabe vor dem Weitergeben. Eigene Sensorzustände
können ebenfalls vertrauliche Inhalte enthalten. Die Exporte sind kein Backup.

## Weg B: HA-MCP mit dem Agenten verbinden

Eine MCP-Verbindung erlaubt dem Agenten direkte Abfragen. Ob er außerdem
Dashboards, Helfer oder Scripts anlegen kann, hängt von den tatsächlich
bereitgestellten Werkzeugen ab. Der Agent prüft diese Fähigkeiten zuerst.

Für den hier beschriebenen Konfigurations-Workflow bietet das Community-Projekt
[HA-MCP](https://github.com/homeassistant-ai/ha-mcp) entsprechende Werkzeuge.
Die [Installationsanleitung der HACS-Integration](https://github.com/homeassistant-ai/ha-mcp-integration#readme)
ist die aktuelle Quelle für Einrichtung und Verbindungsoptionen:

1. In HACS das Repository `https://github.com/homeassistant-ai/ha-mcp-integration`
   als **Integration** hinzufügen und herunterladen.
2. Home Assistant neu starten und unter **Einstellungen → Geräte & Dienste →
   Integration hinzufügen** die **HA-MCP Custom Component / HA-MCP Server**
   einrichten.
3. In der Konfiguration dieses Eintrags die angebotene Verbindungs-URL kopieren.
4. Die URL in den privaten MCP-Einstellungen deines Agenten hinterlegen. Nutze die
   zur Ausführungsumgebung passende lokale oder entfernte Verbindung. Ein Agent
   in der Cloud kann eine reine LAN-Adresse nicht erreichen.
5. Eine lesende Abfrage von Bereichen und Entitäten testen lassen. Bereits
   vorhandene MCP-Installationen zuerst prüfen, statt zusätzlich einen zweiten
   Server aufzusetzen.

Die Verbindungs-URL kann selbst den Zugangsschlüssel enthalten. Speichere sie
nicht im Repository oder im Startprompt. Die öffentliche Skill-Datei enthält
deshalb keine vorkonfigurierte Verbindung.

Home Assistant hat außerdem einen eigenen
[Model Context Protocol Server](https://www.home-assistant.io/integrations/mcp_server/).
Seine verfügbaren Werkzeuge richten sich nach den freigegebenen LLM-APIs. Prüfe,
ob deine Verbindung die benötigten Konfigurationsoperationen anbietet; fehlen
sie, kann der Agent trotzdem anhand eines Exports lokale Dashboard-YAML bauen.

Startauftrag für eine bereits verbundene Installation:

```text
Lies skills/mufflonbau-dashboard/SKILL.md und baue mein persönliches Dashboard
mit dem verbundenen HA-MCP. Lies zuerst die Bereiche, Geräte, Entitäten und
die bestehende Dashboard-Konfiguration. Nutze vorhandene Helfer und Scripts.
Erstelle die passende lokale Strategie in examples/my-dashboard.local.yaml.
Wenn der Server Dashboard-Schreibzugriff bereitstellt, richte ein neues Dashboard
unter dashboard-mein-zuhause ein und prüfe die gespeicherte Konfiguration durch
erneutes Lesen. Bestehende Dashboards sollen erhalten bleiben. Starte zum Testen
keine Geräteaktionen. Zugangsdaten und persönliche Konfiguration bleiben lokal.
```

Mit MCP kann der Agent bei einem späteren Auftrag auch fehlende Raum-Scripts
oder Helfer anlegen, sofern sein Server das unterstützt und die exakten
Geräteaktionen bekannt sind. Im reinen Export-Weg liefert er stattdessen die
einzufügende Konfiguration.

## Ergebnis prüfen und einfügen

Der Agent liefert eine fertige Strategie, eine Liste noch offener Zuordnungen und
das Ergebnis der Prüfung. Im Repo lässt sich persönliche YAML mit Node.js 22+
prüfen:

```sh
npm ci
node --test test/yaml.test.js
```

Dateien unter `examples/*.local.yaml` werden dabei mitgeprüft und bleiben aus Git
ausgeschlossen. `debug/*.local.json` ist ebenfalls ignoriert. Den Agenten-Skill
kann jeder Agent direkt über den oben genannten Dateipfad lesen; eine automatische
Skill-Installation in einem bestimmten Client ist für diesen Weg nicht nötig.

Im **Strategie-Editor** steht `type: custom:mufflonbau` auf oberster Ebene.
Im **vollständigen YAML-/Raw-Editor** muss die Strategie unter `strategy:` stehen.
Die [README](../README.md#installation) beschreibt die Installation der Ressource.
Der Export allein installiert keine HACS-Ressource und erstellt keine Helfer.

## Dashboard bearbeiten, obwohl der Kiosk-Modus aktiv ist

Wenn Kopfzeile und Bearbeitungsmenü fehlen, hänge **`?disable_km`** an die
Dashboard-Adresse und lade die Seite neu, beispielsweise:

```text
/dashboard-mein-zuhause/home?disable_km
```

Bei einer Adresse mit vorhandenen Query-Parametern verwendest du `&disable_km`.
Danach kannst du über die HA-Kopfzeile **Dashboard bearbeiten** und den passenden
Editor öffnen. Entferne den Parameter und lade neu, um wieder zur gespeicherten
Kiosk-Ansicht zu wechseln. Deine Konfiguration wird dadurch nicht geändert.
Das setzt das installierte [Kiosk-Mode-Plugin](https://github.com/NemesisRE/kiosk-mode#query-strings)
voraus. Die dauerhafte Abschaltung über `kiosk_mode` steht in der
[README](../README.md#access-the-editor-when-kiosk-mode-hides-the-controls).

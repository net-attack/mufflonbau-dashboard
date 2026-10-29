# Wohnungskarte · v0.4.0-dev.1

Diese Vorabversion ergänzt eine optionale Pixi-Karte im bestehenden Untermenü
**Räume**. Es bleibt **eine Karte der gesamten Wohnung**. Die seitliche Raumauswahl
ändert den Ausschnitt derselben Szene. Die bestehenden Startseiten-, Klima-,
Reinigungs- und Systemkarten bleiben erhalten. Separate Raumdetailseiten erhalten
keine zusätzliche Pixi-Karte.

Der erste Dev-Release gibt ausschließlich **2D** frei. 3D ist zurückgestellt.
Die isolierte Architekturvorschau bleibt unter `npm run dev:spatial-poc` verfügbar.

## Bedienung

- Licht antippen: ein-/ausschalten. Halten öffnet Helligkeit und die tatsächlich
  unterstützten Farbregler. Halten und vertikal ziehen stellt den Wert ein;
  der Befehl wird beim Loslassen gesendet.
- Heizung antippen: umschalten und Solltemperatur öffnen. Messwert und Sollwert
  bleiben getrennt. Der gesamte gezeichnete Heizkörper ist anklickbar.
- Steckdosen öffnen zunächst ihre Bedienung. **Jeder** Ein-/Aus-Befehl verlangt
  eine neue Bestätigung. Abbrechen, Schließen und Escape senden keinen Befehl.
  Bestätigte Befehle verwenden ausdrücklich `turn_on` oder `turn_off`.
- Saugfried öffnet Geräteaktionen, die das Gerät tatsächlich unterstützt.
  Start ist der native Gerätestart; bestehende raumbezogene Reinigungshelfer und
  Modusabläufe im Reinigungsbereich bleiben unverändert. Die Karte erfindet keine
  Roboterposition oder Fahrspur aus der simulierten POC-Route.
- Verschieben durch Ziehen, Zoomen per zwei Fingern, Strg-/Cmd-Mausrad oder Tasten.
  Native Geräteschaltflächen in der Seitenleiste bieten Tastaturzugang.
- Details bleiben kompakt am Gerät. Die Karte aktualisiert Zustände aus HA;
  ein gesendeter Befehl ist noch keine bestätigte Zustandsänderung.

Leistung und Verbrauch werden getrennt mit ihren Einheiten gezeigt. Null Watt
ist ein gültiger Messwert. Fehlend, unbekannt und nicht verfügbar werden nicht
in Ersatzwerte oder eingeschaltete Geräte umgewandelt.

## Konfiguration und Isolation

Die Strategie aktiviert die neue Karte nur mit `floorplan_spatial`. Ohne diese
Option bleibt die bestehende SVG-Karte erhalten. Bei fehlendem WebGL gibt es
innerhalb der Karte einen ausdrücklich gekennzeichneten SVG-Rückfall.

`floorplan_spatial` enthält:

- `default_scene`: ID der gesamten Wohnung, beispielsweise `all`.
- `scenes`: eine gemeinsame Szene mit `id`, `label`, `room` und `objects`.
  `room.points` ist der Grundriss als Koordinatenpaare; `room` enthält zusätzlich
  `x`, `y`, `width`, `height`. Die Kamera verwendet einen 600 × 420-Bezugsrahmen.
- `objects`: Formen `rect`, `circle`, `polygon`, `line` oder `text`. `shapes`
  beschreibt 2D-Geometrie; optional bleiben `footprint`, `parts` und `geometry3d`
  aus der Architekturstudie als Geometriedaten erhalten. `device` bindet ein
  Objekt an die ID unter `devices`; dessen Formen dienen auch als Klickfläche.
- `devices`: `id`, `name`, `entity`, `type`, `x`, `y`, optional `z`, `radius`,
  `power`, `energy`, `energy_today`. Steckdosen verwenden `type: outlet`;
  Geräte mit schaltbarer Versorgung beispielsweise `type: appliance`.
- `emitters`: Lichtflächen mit `id`, `entity` (Geräte-ID), Position, Größe und
  optional `kind: panel`, `axis` und `placement`. Felix hat eine eigene Bindung
  und teilt keinen Zustand mit der Leselampe.
- `readings`: Raumname und explizite Temperatur-/Feuchtesensoren; optional
  Raumkoordinaten für die gemeinsame Übersicht.
- `focus_rooms`: IDs, Namen und Kameraausschnitte (`x`, `y`, `zoom`) innerhalb
  derselben Gesamtkarte. Diese Einträge erzeugen keine weiteren Karten.

Persönliche Koordinaten und Entitäten gehören ausschließlich in ignorierte
`examples/*.local.yaml` / `debug/*.local.json`. Das HACS-Bundle enthält weder
Wohnungsgeometrie noch Gerätezuordnungen. Gemeinsame Tests verwenden synthetische
Daten in `scripts/spatial-fixture.mjs`.

## Technik und Prüfung

PixiJS 8.22.0 wird mit esbuild in dieselbe HACS-JavaScript-Ressource gebündelt;
keine zusätzlichen CDN-Dateien oder manuellen Ressourcen sind erforderlich.
Das Bundle wächst von etwa 5,24 MB auf etwa 7,08 MB unkomprimiert. Der Renderer
wird erst beim Öffnen einer entsprechend konfigurierten Karte initialisiert.

Der Anwendungsticker ist gestoppt. Zustandsänderungen, Kamera und Hover lösen
Zeichenvorgänge aus; sichtbare tatsächliche Heizaktivität darf animieren. Im
Ruhezustand werden keine Szenenframes gesendet. Interne Pixi-Verwaltung ist damit
nicht gleichbedeutend mit garantiert null CPU-Verbrauch. Die Auflösung wird auf
zweifache Pixeldichte begrenzt. Beim Verlassen werden Kontext, Beobachter,
Ereignisse und Animation freigegeben.

`npm run ci` prüft Bundle, Beispiele, Kernlogik, Templates, bestehende Browser-
Funktionen und die neue produktive Karte. Die neuen Prüfungen umfassen echte
Canvas-Klicks, Zustandsanbindung, Umriss-Klickflächen, Steckdosenbestätigung,
Abbrechen, Farb-/Helligkeitsfähigkeiten, Messwertnullen, kompakte Popups,
verschiedene Displaygrößen und das Ausbleiben von Leerlauf-Redraws.
Screenshots unter `test-results/spatial-production/` sind synthetisch und belegen
keinen tatsächlich geschalteten physischen Verbraucher.

## Dev-Veröffentlichung

`v0.4.0-dev.1` wird als GitHub-Prerelease veröffentlicht und ersetzt nicht die
stabile Version `v0.3.5`. Die Installation über HACS erfolgt gezielt mit diesem
Tag. Anschließend Dashboard neu laden; bei einer bereits geladenen Ressource
gegebenenfalls Browsercache erneuern. Ein Home-Assistant-Core-Update ist nicht
Teil dieses Releases.

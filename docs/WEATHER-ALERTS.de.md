# Wetter und Warnungen testen

Die Erweiterung ist optional und entsteht auf `feature/weather-alerts`. Der
Saugfried-Aktionsfix bleibt auf `main`. Zum Testen einen **GitHub Pre-Release**
dieses Branches in HACS auswählen: Mufflonbau → ⋮ → Informationen aktualisieren →
Neu herunterladen → Andere Version / „Need a different version?“ → Release.
Der HACS-Dialog listet Releases, keine beliebigen Feature-Branches.
`v0.1.0` ist der stabile Stand einschließlich Saugfried-Fix;
`v0.2.0-beta.1` ist der erste Wetter-Teststand. Weitere Beta-Tags werden nach
erfolgreichen Tests über `.github/workflows/beta.yml` als Pre-Release veröffentlicht.
Ein Release lädt die JavaScript-Ressource für alle Mufflonbau-Dashboards;
die Wetterfunktion erscheint nur in Strategien mit `weather_alerts`.
Danach das Tablet neu laden. Zum Zurückwechseln den stabilen Release auswählen.

## Festgestellter Bestand am 17.10.2026

Home Assistant 2026.10.1, Bubble Card 3.4.2 und Companion App auf einem Samsung
Galaxy Tab A11. Fully Kiosk und browser_mod sind nicht eingerichtet. Es gab
anfangs keine NINA-, DWD-Warnungs- oder Radar-Integration. NINA und die native
DWD Weather Warnings Integration wurden für **Stadt Regensburg** eingerichtet;
nach erneutem Laden läuft auch DWD. Aktuell melden beide keine Warnungen.

Die konkreten IDs und das Dashboard-Backup stehen ausschließlich in den
ignorierten lokalen Dateien:

- `debug/weather-before.local.json`: gelesene Konfiguration und Inventar.
- `examples/mufflonbau-weather.local.yaml`: komplette Test-Strategie mit den
  zwölf tatsächlich entdeckten NINA-/DWD-Quellen und dem Tablet-Notify-Aufruf.
- `debug/weather-alerts-package.local.yaml`: installierbares persönliches Paket.

NINA stellt zehn binäre Warnungs-Slots bereit. `nina.get_details` liefert pro
aktivem Slot `id`, `headline`, `severity`, `affected_areas`, `start`, `expires`,
`description` und `recommended_actions`. Der Service wurde live aufgerufen;
inaktive Slots liefern `null`. Die aktiven Datenfelder wurden zusätzlich am
Quellcode der installierten Core-Version geprüft. NINA liefert hier keine
eigene Kategorie; diese wird nicht erfunden. Der Service vermeidet die ab
2026.11 entfernten ausführlichen Attribute des binären Sensors.

DWD liefert einen Sensor für aktuelle und einen für erwartete Warnungen.
Live geprüft: `region_id`, `region_name`, `warning_count`, `last_update`.
Die Felder `warning_<n>_level`, `_headline`, `_type`, `_name`, `_description`,
`_instruction`, `_start`, `_end` stammen aus dem Quellcode von Core 2026.10.1;
bei der Prüfung gab es keine aktive Warnung, um diese live auszulesen.

Es gibt keine Radar-Entität. Der Fallback ist der offizielle animierte
DWD-Radarfilm für Bayern (HTTP 200, image/gif geprüft), der erst beim Öffnen des
Popups geladen wird. Quelle und Messzeit bleiben im Bild erkennbar. Daraus
wird keine punktgenaue Niederschlagsvorhersage für die Wohnung abgeleitet.

## Backend installieren

HACS installiert nur die JavaScript-Datei. Das HA-Paket und die Jinja-Makros
müssen zusätzlich ins HA-Konfigurationsverzeichnis. Die vorhandene MCP-Verbindung
kann Integrationen und Dashboards konfigurieren, bietet aber keinen verwalteten
Dateischreibzugriff für Pakete und `custom_templates`.

1. Mit `node scripts/weather-package.mjs` das persönliche Paket aus der lokalen
   Test-Strategie erzeugen. Die Datei enthält echte Quell-IDs, keine Platzhalter.
2. `debug/weather-alerts-package.local.yaml` nach
   `/config/packages/weather_alerts.yaml` kopieren.
3. `packages/weather_alerts.jinja` nach
   `/config/custom_templates/mufflonbau_weather_alerts.jinja` kopieren.
4. Vorhandene Paket-Einbindung prüfen. Falls noch keine existiert, innerhalb
   des bestehenden `homeassistant:`-Blocks ergänzen:

   ```yaml
   packages: !include_dir_named packages
   ```

5. HA-Konfiguration prüfen. Bei bestehender Paket-Einbindung:
   `homeassistant.reload_custom_templates`, `template.reload` und
   `automation.reload` aufrufen. Für eine neu hinzugefügte Paket-Einbindung ist
   ein geplanter HA-Neustart erforderlich.
6. Prüfen, dass das Paket **sensor.mufflonbau_weather_alerts neu angelegt hat**.
   Das ist der eigene Sammelsensor, keine angeblich vorhandene Integration.
   Erst dann die lokale Test-Strategie in ein separates Test-Dashboard einfügen.
   Das Strategie-Editor-Format hat `type` oben; im vollständigen Raw-Editor muss
   die gesamte Strategie unter `strategy:` stehen.

Ein fehlendes Backend oder eine ausgefallene Quelle wird als nicht verfügbar
angezeigt. Es erscheint dann kein unbegründetes „Alles in Ordnung“.
Die Popups werden von `src/core/weather-alerts.js` erzeugt: Bubble Card
Standalone-Format mit `cards:`, ohne den veralteten Vertical-Stack-Aufbau.
Warnungen sind nach Stufe sortiert; beide Indikatoren öffnen dieselbe Liste.

## Schweregrade und Ton

| Quelle | Ruhiger Hinweis | Popup automatisch | Tablet-Ton |
| --- | --- | --- | --- |
| NINA | minor=1, moderate=2, unknown=1 | severe=3, extreme=4 | severe und extreme |
| DWD | Stufe 1 und 2 | Stufe 3 und 4 | Stufe 4 |

Das Popup funktioniert auf allen Mufflonbau-Seiten, solange das Dashboard offen
und verbunden ist. Ein ausgeschaltetes oder getrenntes Tablet kann damit nicht
zuverlässig geweckt werden. Die Companion-Notification erreicht den konfigurierten
Tablet-Dienst unabhängig vom sichtbaren Dashboard; ihre Zustellung hängt von der
App-Verbindung und den Android-Berechtigungen ab.

Für den Ton verwendet die Automation den vorhandenen `notify.mobile_app_*`-Dienst
des Tablets und den Kanal **Mufflonbau Warnungen**. Keine Endlosschleife, kein
TTS, kein Hochsetzen der Lautstärke und kein Umgehen von „Nicht stören“.
Die vorhandene Tablet-Lautstärke bleibt damit erhalten. In Android diesen Kanal
auf einen kurzen Signalton von ungefähr 1–3 Sekunden und eine angenehme
Benachrichtigungslautstärke einstellen. Diese Geräte-Einstellung kann die
HA-Konfiguration nicht erzwingen. Ton und tatsächliche Zustellung wurden nicht
am Gerät getestet. Niedrige Warnstufen senden keine Tablet-Nachricht.

## Doppelte Meldungen verhindern

Die Normalisierung läuft bei Zustands- und Attributänderungen der konfigurierten
Quellen. Das erzeugte persönliche Paket verwendet zwölf konkrete State-Trigger;
es gibt keine Abfrageschleife. `nina.get_details` wird nur für aktive Slots benutzt.

Der triggerbasierte Sammelsensor speichert eine wiederhergestellte `ledger`-
Attributtabelle mit höchster bereits behandelter Stufe je Warnung. NINA verwendet
die echte Meldungs-ID, ersatzweise Titel+Beginn+Gebiet. DWD verwendet
Region+Warnungstyp+Beginn. Slot-Reihenfolge, Vorwarnungs-/Aktuell-Sensor,
`last_update` und Beschreibung sind keine Identität.
Gelöschte Warnungen bleiben bis sieben Tage nach ihrem letzten Ablaufdatum in
der Tabelle, ebenso bei Quellausfällen. Eine Änderung von Text oder Zeitstempel
und ein Absinken/Wiederansteigen auf die bereits behandelte Stufe lösen keinen
neuen Ton aus. Eine neue ID oder eine höhere wichtige Stufe tun dies.

`popup_token` und `sound_token` ändern sich nur bei solchen neuen Ereignissen.
Die Ton-Automation reagiert auf den persistierten Sensorwechsel, nicht auf einen
Browser-Refresh. Beim Wiederherstellen des Sensors wird der alte Ton nicht
nochmals abgespielt. Der Browser merkt sich den gesehenen Popup-Token lokal.
Nach Ablauf der siebentägigen Historie kann eine erneut auftauchende alte ID als
neues Ereignis gelten. Geht der persistierte HA-Zustand verloren, geht auch diese
Historie verloren.

## Prüfung

`npm run ci` prüft Bundle, YAML-Beispiele, Jinja-Normalisierung und
Deduplication sowie Browser-Verhalten mit synthetischen Warnungen. Die Tests
starten keine Geräte und versenden keine echten Warnungen. Die neue
Paket-Konfiguration muss nach der Installation zusätzlich mit
`homeassistant.check_config` auf der Zielinstanz geprüft werden. Ein erfolgreicher
Check der bisherigen Live-Konfiguration prüft ein noch nicht installiertes Paket
nicht. Die Browser-Galerie verwendet HA-Platzhalter; sie beweist keine echte
Bubble- oder Companion-App-Funktion am Tablet.
Zusätzlich wurden die Makros im Template-Interpreter der Zielinstanz ausgeführt
(erste synthetische Meldung: ein Ereignis; Wiederholung: null Ereignisse).
Ein separater lokaler Chromium-Test mit dem echten Bubble-Card-3.4.2-Bundle
prüfte Öffnen, Inhaltsaufbau und Schließen eines Standalone-Popups innerhalb
der Mufflonbau-Shell; die umgebende Dashboard-Karte blieb sichtbar.

Quellen: [NINA](https://www.home-assistant.io/integrations/nina/),
[DWD](https://www.home-assistant.io/integrations/dwd_weather_warnings/),
[Bubble Standalone-Popups](https://github.com/Clooos/Bubble-Card#standalone-pop-up-format-v320),
[Android-Töne](https://companion.home-assistant.io/docs/notifications/notification-sounds/).

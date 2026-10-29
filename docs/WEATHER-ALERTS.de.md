# Wetter und Warnungen im Mufflon Board

Ab v0.3.0 zeigt **Klima** die vorhandene Wettervorhersage, einen dauerhaft erreichbaren NINA-/DWD-Warnstatus und den Regenradar-Zugang. **Zuhause** bleibt bei Entwarnung kompakt; aktive Warnungen erscheinen hervorgehoben beim Wetter. Beide Bereiche öffnen dieselben Warnungs- und Radar-Popups. Die Kachelanordnung aus v0.2.2 bleibt erhalten.

HACS installiert das JavaScript. Der Aggregatsensor und seine Automation brauchen zusätzlich ein Backend. Für den vorhandenen MQTT-Broker ist die [MQTT-Blueprint-Installation](WEATHER-MQTT.de.md) eingerichtet; das unten beschriebene Dateipaket bleibt eine Alternative. Nur **eine** Variante gleichzeitig installieren.

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
- `packages/weather-alerts-package.local.yaml`: alternatives persönliches Dateipaket.
- `debug/weather-mqtt-setup.local.json`: private MQTT-Topics und entdeckte Quellen.
- `debug/weather-mqtt-automation-after.local.json`: installierte Automation und Read-back.

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

## Alternative: Backend als Dateipaket installieren

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

Ein fehlendes Backend oder ausgefallene Quellen erscheinen gebündelt als ein
Eintrag **NINA & DWD** im **Systemstatus**. Auf Zuhause zeigt die Systemkachel
nur die Anzahl der Probleme; einzelne technische Fehler stehen nicht mehr unter
dem Wetter. Echte Warnungen bleiben dort sichtbar. Klima meldet bei Störungen
„Warnstatus prüfen“, das Warnungs-Popup einen unvollständigen Status mit Link
zum Systemstatus. Es erscheint dann keine unbegründete Entwarnung. Der
Systemstatus wird auch ohne weitere konfigurierte `monitors` angelegt.
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
Quellen. Die MQTT-Automation verwendet explizite State-Trigger für die entdeckten Quellen;
es gibt keine Abfrageschleife. `nina.get_details` wird nur für aktive Slots benutzt.

Die MQTT-Variante speichert Zustand und `ledger`-Historie gemeinsam als retained JSON auf dem vorhandenen Broker. Vor einer Benachrichtigung wartet sie auf die Bestätigung des genauen Commits durch den Sensor. Fehlt diese Historie, stoppt die Verarbeitung ohne Ton; sie wird niemals automatisch geleert. Das alternative Dateipaket verwendet einen wiederhergestellten triggerbasierten Sammelsensor. Beide führen die höchste bereits behandelte Stufe je Warnung. NINA verwendet
die echte Meldungs-ID, ersatzweise Titel+Beginn+Gebiet. DWD verwendet
Region+Warnungstyp+Beginn. Slot-Reihenfolge, Vorwarnungs-/Aktuell-Sensor,
`last_update` und Beschreibung sind keine Identität.
Gelöschte Warnungen bleiben bis sieben Tage nach ihrem letzten Ablaufdatum in
der Tabelle, ebenso bei Quellausfällen. Eine Änderung von Text oder Zeitstempel
und ein Absinken/Wiederansteigen auf die bereits behandelte Stufe lösen keinen
neuen Ton aus. Eine neue ID oder eine höhere wichtige Stufe tun dies.

`popup_token` und `sound_token` ändern sich nur bei solchen neuen Ereignissen.
Die MQTT-Automation benachrichtigt nach dem bestätigten Speichern nur bei neuen akustischen Ereignissen. Das Dateipaket verwendet dafür eine separate Ton-Automation. Ein Browser-Refresh löst keinen Ton aus. Beim Wiederherstellen des Sensors wird der alte Ton nicht
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

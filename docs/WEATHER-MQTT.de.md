# NINA und DWD über den vorhandenen MQTT-Broker

Dieser Backend-Weg ergänzt die Wetteroberfläche, wenn kein Zugriff auf
`/config/packages/` oder `/config/custom_templates/` besteht. Er benötigt
Home Assistant **2026.10.1 oder neuer**, bestehende NINA-/DWD-Warnsensoren und
die MQTT-Integration mit aktiviertem Discovery. Ein bereits vorhandener
Mosquitto-Broker kann verwendet werden. Die Anbindung arbeitet mit einem echten
MQTT-Discovery-Sensor und retained Nachrichten; sie schreibt keine erfundenen
Quellzustände in die HA-State-Machine.

Den MQTT-Weg **anstelle** des ursprünglichen Dateipakets einsetzen. Zwei Collector
oder zwei Schreibquellen für denselben Sensor/Speichertopic sind nicht erlaubt.
Die bestehende Radar-Anbindung und das Frontend bleiben unabhängig davon.

## Dateien und Erzeugung

- `packages/weather_alerts.jinja` bleibt die gemeinsame Quelle für Normalisierung,
  Warnidentitäten und die sieben Tage aufbewahrte Dedup-Historie.
- `scripts/weather-mqtt-blueprint.mjs` erzeugt
  `blueprints/automation/mufflonbau/weather_mqtt.yaml` und
  `blueprints/script/mufflonbau/weather_mqtt_discovery.yaml`.
- Beide Blueprints enthalten die nötigen Templates vollständig; HA benötigt
  **keine** zusätzliche Jinja-Datei und keinen Import aus `custom_templates`.

Nach einer Änderung der gemeinsamen Makros:

```sh
node scripts/weather-mqtt-blueprint.mjs
node scripts/weather-mqtt-blueprint.mjs --check
python3 -m unittest discover -s test -p 'weather_mqtt_test.py'
```

Die generierten Dateien werden committed. Blueprints lassen sich über den
HA-Blueprint-Import bzw. `blueprint/save` installieren; die daraus erstellte
Automation ist über die normale HA-Konfigurations-API verwaltbar. Kein direkter
Zugriff auf `.storage` oder `configuration.yaml` ist nötig.

## Einmalige Einrichtung

1. Die echten NINA- und DWD-Entities sowie vorhandene Warn-Automationen prüfen.
   Nur Sensoren für denselben gewünschten Ort auswählen. Noch keinen Tablet-Ton
   auslösen, um die Anbindung zu testen.
2. Ein eigenes, nachweislich unbenutztes Zustandstopic wählen, beispielsweise mit
   zufälliger Kennung. Im MQTT-Dialog auf genau dieses Topic hören und prüfen,
   dass keine retained Nutzdaten vorhanden sind. Auch ein eigenes Discovery-Topic
   unter dem tatsächlich eingestellten Prefix wählen. Beispielstruktur:
   `<prefix>/sensor/<eindeutige_id>/config`. Beide Topics und das Birth-Topic
   müssen verschieden sein; Wildcards sind nicht zulässig.
3. Den Discovery-Script-Blueprint installieren und daraus ein Script erstellen.
   Gewünschte neue Sensor-ID, Zustandstopic, Discovery-Topic und tatsächliches
   HA-Birth-Topic eintragen. Das Script einmal ausführen. Es veröffentlicht nur
   die Discovery-Konfiguration und **ändert keine bestehende Warnhistorie**.
4. Den tatsächlich angelegten MQTT-Sensor lesen und seine ID prüfen. Bei einer
   Namenskollision kann HA ein Suffix vergeben. Diese tatsächliche ID wird im
   Collector und im Dashboard verwendet.
5. Ausschließlich auf dem nachweislich frischen Zustandstopic einmalig den
   Initialzustand mit `mqtt.publish`, `qos: 1`, `retain: true` veröffentlichen.
   Die Generatorfunktion `initialWeatherMqttPayload(stateTopic)` liefert das
   passende JSON. Es enthält eine leere Historie und den ausdrücklichen
   Prüfhinweis „Warnquellen wurden noch nicht ausgewertet“. Es behauptet noch
   keine geprüfte Warnfreiheit. Einen vorhandenen Speicher niemals so leeren.
6. Den Automation-Blueprint installieren und daraus **eine** Automation erstellen.
   Echte Quellsensoren, tatsächlichen Aggregatsensor und dieselben Topics
   auswählen. Optionale `alert_actions` zunächst leer lassen. Manuell ausführen
   und die Sensorattribute `warnings`, `problems`, `ledger` und `commit_id` lesen.
7. Im bestehenden Dashboard `weather_alerts.entity` auf den tatsächlich angelegten
   Sensor setzen. Ein leerer Warnzustand mit `problems: []` bedeutet, dass die
   ausgewählten Quellen aktuell keine aktiven Warnungen melden. Problemhinweise
   bleiben von „keine Warnung“ unterscheidbar.

Der Generator exportiert zusätzlich
`weatherMqttDiscoveryPayload({ stateTopic, discoveryTopic, aggregateEntity })`,
falls die Einrichtung direkt über `mqtt.publish` statt über das Discovery-Script
erfolgt. Die Discovery-Nachricht verwendet `default_entity_id` als gewünschten
Startnamen; die tatsächlich angelegte ID muss dennoch gelesen werden.

`mqtt.publish` erwartet in Core 2026.10.1 `topic`, `payload`, `qos` und `retain`
**direkt unter `data`**. `publish_options` ist lediglich eine Gruppe im
Aktionseditor und kein zusätzlicher verschachtelter Datenparameter.

## Warnlogik, Popups und Ton

Die gemeinsamen Makros lesen die realen NINA-Detailantworten und DWD-Attribute.
NINA verwendet eine vorhandene Warn-ID; ohne ID entsteht ein deterministischer
Schlüssel aus Titel, Beginn und Gebiet. DWD verwendet Gebiet, Warnart und Beginn;
Listenindex, aktueller/vorläufiger Sensor, Überschriftänderungen und
Aktualisierungszeitstempel sind keine neue Warnidentität. Bei mehrfach auftauchender
Identität zählt die höchste gemeldete Stufe.

- NINA Minor/Moderate entsprechen Stufe 1/2; Severe/Extreme entsprechen 3/4.
- DWD verwendet die tatsächlich gemeldete Warnstufe 1 bis 4.
- Neue Warnung oder Eskalation ab Stufe 3 erzeugt einen neuen `popup_token`.
- Ein neuer NINA-Höchststand ab 3 oder DWD-Höchststand ab 4 erzeugt zusätzlich
  `sound_events` und einen neuen `sound_token`.
- Gleichbleibende Attribute, Rückstufung, Ausfall und Wiederkehr derselben
  Warnung lösen keinen weiteren Ton aus. Eine spätere Steigerung über den bisher
  höchsten bekannten Warnwert darf erneut melden.

`alert_actions` ist ein optionaler HA-Aktionsselektor. Er läuft einmal pro
bestätigtem neuen akustischem Warnereignis; mehrere gleichzeitig erkannte Warnungen
werden gemeinsam gemeldet. Verfügbare Variablen sind `sound_events`,
`sound_token`, `alert_title` und `alert_message`. Hier kann die **tatsächlich
vorhandene** Benachrichtigungsaktion der Tablet-Companion-App eingesetzt werden.
Es wird kein Fully Kiosk, browser_mod, Lautsprecher oder TTS angenommen.

Der Blueprint selbst verändert keine Lautstärke und startet keine Alarmschleife.
Kanalton und Lautstärke stellt man beim verwendeten Android-Benachrichtigungskanal
ein. Eine kurze Signaldauer muss am wirklichen Tablet geprüft werden. Leere
Aktionen bleiben vollständig still. Die Popup-Darstellung nutzt weiter das
bereits vorhandene Dashboard-Warnfenster und dessen Tokens.

## Neustart und Zustellgrenzen

Alle Läufe sind `queued`. Zustands- und Attributänderungen ausschließlich der
ausgewählten Quellsensoren, HA-Start, MQTT-Birth `online` und die Wiederkehr des
Aggregatsensors lösen Verarbeitung aus. Es gibt keinen Polling-Takt und keinen
globalen `state_changed`-Listener. Ablaufzeiten werden beim nächsten
Quell-/Wiederanlaufereignis erneut ausgewertet; die Warnintegrationen bleiben
für ihre regulären Quellenaktualisierungen verantwortlich.

Der Collector registriert Discovery und wartet bis zu 45 Sekunden, bis der
Aggregatsensor eine gültige retained Historie für genau das konfigurierte Topic
zeigt. Ohne diese Historie stoppt er: **kein automatischer Ersatz durch `{}`**,
keine Zustandsveröffentlichung und kein Ton. Nach einem MQTT-Verbindungsfehler
oder einer verlorenen Broker-Datenbank muss zuerst die Speicherung geprüft und
gegebenenfalls aus einem Backup wiederhergestellt werden.

Erst innerhalb der laufenden Aktion, nach der NINA-Abfrage, wird die neueste
Historie gelesen. Warnliste, Probleme, Historie und Tokens werden gemeinsam als
retained JSON mit QoS 1 gespeichert. Vor Benachrichtigungen und Abschluss des
Warteschlangenlaufs wartet der Collector zusätzlich auf die exakte Rückmeldung
von `commit_id` **und** Historie am Aggregatsensor. Dies verhindert, dass schnelle
Folgeläufe noch eine alte Historie lesen.

Ein Neustart veröffentlicht keine alte Benachrichtigung erneut. Externe
Benachrichtigungen und MQTT können jedoch nicht atomar gemeinsam zugestellt
werden: Stürzt HA nach dem Speicher-Commit und vor dem Ton ab, kann diese eine
Benachrichtigung ausbleiben. Das Verfahren bevorzugt dann ausbleibende
Wiederholungen. QoS 1 ersetzt kein dauerhaftes Backup der Broker-Datenbank.

Zum Abschalten die erzeugte Automation deaktivieren. Die gespeicherte Historie
stehen lassen; dadurch bleibt die Dedup-Funktion bei einer späteren Aktivierung
erhalten. Kein bestehendes Speichertopic mit leerem JSON überschreiben.

## Prüfung

`test/weather_mqtt_test.py` führt die Templates und die Aktionsreihenfolge aus
den echten generierten Blueprints mit synthetischen HA-/MQTT-Grenzen aus:
Identitäten, Stufen, mehrere Warnungen, Ausfälle, fehlende Details, sieben Tage
Historie, JSON-Restore, verzögerte Commit-Rückmeldung, Absturzgrenze, manuelle
Ausführung und HA-Sandbox-Limits. Das ersetzt keine echte Tablet-Tonprobe.

Referenzen: [MQTT Discovery und retained Zustände](https://www.home-assistant.io/integrations/mqtt/),
[MQTT-Sensor-Konfiguration](https://www.home-assistant.io/integrations/sensor.mqtt/),
[Publish-Schema in Core 2026.10.1](https://github.com/home-assistant/core/blob/2026.10.1/homeassistant/components/mqtt/__init__.py).

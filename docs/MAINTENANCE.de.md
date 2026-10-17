# Saugfrieds Wartungsstube testen

Die optionale Wartungsstube ergänzt die vorhandene Reinigungsseite unter den
Steuerungen und der Karte. Flusenfels behält seine Farben und Schriften in
Ambient und Night. Ohne `cleaning.maintenance` bleibt die bisherige Ansicht.

In der **Strategie-Konfiguration** unter dem vorhandenen `cleaning:` ergänzen:

```yaml
maintenance:
  - name: Filter
    percent: sensor.robot_filter_left
    remaining: sensor.robot_filter_time_left
    warning_below: 10
```

Die IDs hier sind synthetisch. Vor dem Einfügen durch vorhandene Sensoren aus der
Geräteintegration ersetzen. Die private, ignorierte Datei
`examples/mufflonbau.local.yaml` enthält bereits die aus dem tatsächlichen
Saugfried-Inventar geprüften Zuordnungen. Sie kann als vollständige Konfiguration
in den Strategie-Editor kopiert werden. Ein vollständiger Rohkonfigurationseditor
erwartet dieselbe Konfiguration unter `strategy:`.

Im geprüften Inventar gehören alle sieben Wartungspaare zum selben Dreame-Gerät:

| Bauteil / Pflege | Restlebensdauer | Restzeit des Gerätezählers |
| --- | --- | --- |
| Hauptbürste | 50 % | 151 h |
| Seitenbürste | 25 % | 51 h |
| Filter | 1 % | 1 h |
| Sensoren reinigen | 11 % | 3 h |
| Räder reinigen | 11 % | 3 d |
| Kalkschutz | 53 % | 590 d |
| Silberionen | 80 % | 294 d |

Das sind Inventarwerte beim Einrichten, keine dauerhaft garantierten Livewerte.
Die Oberfläche liest spätere Werte direkt aus Home Assistant. Es ist keine neue
Integration und kein HA-Paket nötig. Personenbezogene Entity-IDs bleiben in der
privaten YAML; gemeinsame Beispiele und Screenshots verwenden Testdaten.

`percent` bezeichnet verbleibende Lebensdauer in `%`. Bei 0 % oder 0 Restzeit
erscheint „Fällig“, bis einschließlich 10 % „Bald fällig“, darüber „In Ordnung“.
Die Prozentgrenze lässt sich je Bauteil mit `warning_below` ändern. Restzeit in
Stunden und Tagen wird unverändert mit der vom Sensor gemeldeten Einheit gezeigt.
Sie ist kein Kalendertermin. Eine Restzeit ohne Prozentwert reicht bei einem
positiven Wert nicht für die Aussage „In Ordnung“. Fehlende oder unbrauchbare
Werte erscheinen als Prüfhinweis. Ein bekannter niedriger Prozentwert bleibt
auch dann als Wartungshinweis sichtbar, wenn seine Restzeit nicht erreichbar ist.

Antippen eines Werts öffnet Home Assistants vorhandene Sensor-Detailansicht.
Es wird kein Wartungszähler zurückgesetzt und keine Reinigung gestartet. Nach
einer tatsächlich erledigten Wartung kann der Zähler wie bisher in der
Geräteintegration zurückgesetzt werden.

Ab HACS-Version **`v0.2.0`** zusammen mit Lüftung, Wäscheinfo und Einkaufsliste
verfügbar. In HACS aktualisieren, danach das Dashboard neu laden
und die private YAML ergänzen. Besonders den Filterhinweis, Stunden/Tage,
Lesbarkeit und Scrollen bis zum letzten Bauteil am Tablet prüfen. Zurück zur
bisherigen Darstellung: `maintenance:` entfernen und die Strategie speichern.

Lokal geprüft: HA-YAML-1.1-Parser, Dashboardgenerierung, Einheiten und Grenzwerte,
fehlende/unbekannte/nicht verfügbare Werte, Liveupdates, Sensordetails sowie
Tablet-/Handylayout in Ambient und Night. Die Browserprüfung nutzt simulierte
HA-Zustände und bestätigt keine tatsächliche Restlebensdauer eines Bauteils.

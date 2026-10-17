# Lüftungsampel testen

Die optionale Lüftungsampel ergänzt eine kompakte Kachel auf der Startseite. Sie
öffnet eine Detail-Unteransicht mit Innen-/Außenwerten und einer Einschätzung je
Raum. Sie verwendet dieselben Farben, Abstände, Touch-Ziele und die Home-Navigation
wie die vorhandenen Seiten. Die Navigationsleiste bekommt keinen weiteren Eintrag.
Es werden keine Fenster, Heizungen oder Entfeuchter geschaltet und keine Helfer,
Automationen oder zusätzlichen Integrationen benötigt.

In HACS auf **`v0.2.0`** oder neuer aktualisieren und anschließend das Dashboard
neu laden. Lüftung, Wäscheinfo, Einkaufsliste und Wartungsstube sind in derselben
Version enthalten. In der
**Strategiekonfiguration** diese Sektion ergänzen; vorhandene Räume behalten:

```yaml
ventilation:
  outdoor_sources:
    - name: Westseite
      temperature: sensor.example_outdoor_west_temperature
      humidity: sensor.example_outdoor_west_humidity
    - name: Ostseite
      temperature: sensor.example_outdoor_east_temperature
      humidity: sensor.example_outdoor_east_humidity
  humidity_high: 60
  min_drying_difference: 1
  max_age_minutes: 180
  # Optional auf vorhandene Räume mit BEIDEN Sensoren beschränken:
  # room_ids: [living, bedroom]
```

Die IDs oben sind synthetisch. Ein vollständiges gemeinsames Beispiel
steht in [examples/ventilation.yaml](../examples/ventilation.yaml). Jeder betrachtete
Raum verwendet ausschließlich seine vorhandenen `temperature`- und `humidity`-
Zuordnungen. Ohne `room_ids` werden Räume mit wenigstens einer dieser Zuordnungen
angezeigt; unvollständige Paare erhalten keine Empfehlung. Räume ganz ohne
Klima-Sensoren werden ausgelassen. Im vollständigen Rohkonfigurationseditor gehört
alles unter `strategy:`. Die Sektion entfernen, um das Feature abzuschalten.

Die Außenpaare stehen in Prioritätsreihenfolge: Das erste vollständige, gültige
und ausreichend aktuelle Paar wird verwendet. Fällt eine seiner Messungen aus,
übernimmt das nächste gesunde Paar. Sobald die bevorzugte Quelle wieder gesund
ist, wird sie erneut verwendet. Temperatur und Feuchte stammen immer aus
demselben konfigurierten Paar; es wird weder gemischt noch gemittelt. Die Details
zeigen aktive Quelle, Ersatzbetrieb und Verfügbarkeit der übrigen Quellen.
Sind alle Paare unbrauchbar, gibt es keine Empfehlung.

Die bisherige Einzelpaar-Konfiguration mit `outdoor_temperature` und
`outdoor_humidity` funktioniert weiter. Entweder diese beiden Felder oder
`outdoor_sources` verwenden, niemals beide Formen zusammen. `name` ist optional.

## Bedeutung der Ampel

- **Grün / „Lüften trocknet“:** Innenfeuchte mindestens `humidity_high` (Standard
  60 %) und die Außenluft bietet mindestens `min_drying_difference` (Standard
  1 g/m³) Trocknungsvorteil, bei derselben Innentemperatur verglichen.
- **„Draußen feuchter“:** Die Außenluft würde bei Innentemperatur mindestens diese
  Differenz an zusätzlicher Feuchtigkeit enthalten. Zum Trocknen lieber warten.
- **„Kaum Trocknungsvorteil“:** Innenfeuchte erhöht, Trocknungsvorteil zu klein.
- **Neutral / „Kein Trocknungsbedarf“:** Innenfeuchte unter der eingestellten
  Schwelle; unter 40 % erscheint „Luft schon trocken“ in den Details.
- **„Messwerte prüfen“:** Mindestens ein Wert fehlt, ist unbekannt, unverfügbar,
  unplausibel, hat eine falsche Einheit oder ist zu alt. Es wird keine Empfehlung
  aus Nullwerten oder dem Wetterbericht konstruiert. Bei mehreren Außenpaaren
  reicht ein vollständig gesundes Paar; ausgefallene Reservefühler blockieren es nicht.

Kühlung ist ein eigener Hinweis: Ab 24 °C innen und mindestens 2 °C kühlerer
Außenluft wird mögliche Kühlung genannt. Mindestens 2 °C wärmere Außenluft erhält
einen Aufheizhinweis, unter 10 °C außen einen Hinweis gegen Auskühlen. Diese
Hinweise machen eine Feuchteampel nicht automatisch grün. Die Feuchteampel ist
kein CO₂-/Luftqualitäts-, Schimmel- oder Gesundheitssensor und gibt keine
Lüftungsdauer vor. Auch eine neutrale Feuchteanzeige ersetzt normales Lüften nicht.

## Berechnung und Gültigkeit

Aus Temperatur und relativer Feuchte wird der Dampfdruck berechnet:

```text
e_s(T) = 6.112 × exp(17.67 × T / (T + 243.5)) hPa
e = e_s(T) × RH / 100
AH = 216.74 × e / (T + 273.15) g/m³
gamma = ln(e / 6.112)
Td = 243.5 × gamma / (17.67 - gamma) °C
```

Die Formel und Umrechnung folgen der [UKCEH-Dokumentation von hydrometlib](https://nerc-ceh.github.io/hydrometlib/api/_generated/hydrometlib.meteorology.absolute_humidity.html),
die auf Bolton (1980), Gleichung 10, und WMO-No. 8 verweist. Der Taupunkt ist die
algebraische Umkehrung derselben Sättigungsdampfdruckfunktion. Bei 0 % relativer
Feuchte beträgt AH genau 0; der nicht endliche Taupunkt wird als Strich angezeigt.

**Absolute Feuchte wird für Innen und Außen jeweils bei der gemessenen Temperatur
angezeigt.** Für den Trocknungsvorteil wird der Außen-Dampfdruck dagegen auf die
**Innentemperatur** umgerechnet: `AH_innen - 216.74 × e_außen / (T_innen + 273.15)`.
So wird die Volumenänderung kalter Luft beim Erwärmen berücksichtigt; der bloße
Vergleich von Prozentwerten oder von g/m³ bei verschiedenen Temperaturen kann in
Grenzfällen die falsche Richtung ergeben. Es handelt sich um eine Näherung für
ähnlichen Luftdruck, keine Vorhersage der späteren Raumfeuchte.

Unterstützt werden °C, °F und K für Temperatur sowie % für relative Feuchte.
Temperaturen außerhalb −40 bis +60 °C und Feuchten außerhalb 0 bis 100 % sind
ungültig. Fehlende Einheiten werden nicht geraten. `humidity_high` erlaubt 40–80 %,
`min_drying_difference` 0,2–5 g/m³, `max_age_minutes` 5–1440 Minuten.

Die Aktualitätsprüfung verwendet `last_reported`, falls HA es liefert, andernfalls
`last_updated`. Das ist der HA-Meldezeitpunkt, kein nachgewiesener physischer
Messzeitpunkt. Ohne gültigen Zeitstempel oder bei mehr als fünf Minuten in der
Zukunft gibt es keine Empfehlung. Der Browser prüft das Alter zusätzlich jede
Minute; nach Verlassen der Seite endet der Timer. Gleichbleibende Sensoren ohne
neuen HA-Zeitstempel können daher trotz erreichbarem Gerät als zu alt erscheinen.
Der Grenzwert lässt sich an das tatsächliche Meldeintervall anpassen. Weder eine
andere Raumquelle noch ein nicht ausdrücklich unter `outdoor_sources`
konfiguriertes Außengerät wird automatisch eingesetzt.

## Persönlicher Entwurf und Prüfumfang

Im lokalen, ignorierten `examples/ventilation.local.yaml` liegt ein vollständiger
Entwurf mit dem bisherigen persönlichen Layout und den tatsächlich beobachteten
Sensorzuordnungen. Der Live-Inventarabruf bestätigte ein verfügbares Temperatur-/
Feuchtepaar desselben Außengeräts an der Westseite. Das östliche Paar war
unverfügbar und ist als Reserve konfiguriert. West bleibt bevorzugt; bei dessen
Ausfall übernimmt Ost, sobald dessen beide Messwerte gültig und aktuell sind.
Innen bleiben die vorhandenen
Zuordnungen für Wohn-/Essbereich, Arbeitszimmer, Küche, Schlafzimmer und Bad
erhalten. Der Flur hat kein vollständiges Paar und wird ausgelassen. Persönliche
Entity-IDs und Inventare bleiben außerhalb der geteilten Dateien.

Die YAML wird mit dem HA-Frontend-Parser geprüft; Unit- und Browserprüfungen
verwenden synthetische Werte, einschließlich Ausfall, Alterung, Rückkehr der
bevorzugten Quelle und vollständigem Ausfall beider Paare.
Die echte Sensoraktualität, Platzierung und Ablesbarkeit am Tablet müssen
nach dem Einspielen geprüft werden. Bei „Messwerte prüfen“ öffnen die Sensor-
Schaltflächen direkt die vorhandenen HA-Entitätsdetails.

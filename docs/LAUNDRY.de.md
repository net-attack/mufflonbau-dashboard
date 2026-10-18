# Wäschekammer

Die optionale Wäschekammer ergänzt die Startseite um eine kompakte Zeile. Tippen
öffnet die Details in einem Dialog mit großen Tasten. Ein erkanntes Programmende
bleibt als „Fertig · Wäsche wartet“ sichtbar, bis ihr „Wäsche erledigt“ bestätigt.
Mit dem optionalen `acknowledged`-Helfer bleibt die Meldung auch bei einem neuen
Lauf erhalten. Die Bestätigung speichert nur, welches Programmende quittiert wurde;
sie setzt keinen laufenden Programmstatus zurück. Schließen, Escape und Neuladen
bestätigen nichts. Waschmaschine und Trockner werden unabhängig erkannt und
bestätigt. Ein Trocknerstart löscht keine Waschmaschinenmeldung; ein Waschgang
setzt keinen anschließenden Trocknerlauf voraus. Die Geräte werden niemals geschaltet.

Ab **`v0.3.2`** sind Prüfzeitpunkte auf volle Sekunden abgestimmt. Dadurch bleibt
die Enderkennung bei unverändertem 0-W-Verbrauch nicht durch Sekundenbruchteile
hängen. Ein Neuladen der Automationen verschiebt eine gültige Endprüfung nicht
mehr. Für diese Reparatur den installierten Wäsche-Blueprint aktualisieren;
das HACS-Frontend allein aktualisiert installierte Blueprints nicht.

Ab HACS-Version **`v0.2.0`** zusammen mit Lüftung, Einkaufsliste und Wartungsstube
verfügbar. In HACS aktualisieren und den Browser neu laden. Das Frontend allein erstellt
keine Helfer oder Automationen; die folgenden Schritte sind zusätzlich notwendig.
Die Wäscheinfo benötigt das Wetterfeature nicht.

## Erkannte Quellen und private Dateien

Im privaten HA-Inventar wurden für Waschmaschine und Trockner jeweils ein
Shelly-Leistungssensor mit Einheit W und eine eingeschaltete Messsteckdose im
Keller gefunden. Direkte Programm-/Fertig-/Restzeitsensoren sind nicht vorhanden.
Die kWh-Zähler eignen sich nicht zur zeitnahen Enderkennung. Die konkreten
beobachteten Entity-IDs stehen ausschließlich in den ignorierten Dateien:

- `examples/laundry-dashboard.local.yaml`: bestehende persönliche Strategie
  einschließlich konkreter Wäschezuordnung.
- `packages/laundry_status.local.yaml`: vollständiges Paket mit echten
  Leistungssensoren, Steckdosen und optionalen Tablet-Meldungen.
- `debug/laundry-detection.local.json`: kurze Auswertung der gelesenen Messhistorie.

Die geteilten Beispiele [`examples/laundry.yaml`](../examples/laundry.yaml) und
[`packages/laundry_status.yaml`](../packages/laundry_status.yaml) enthalten
synthetische Geräte-IDs. Die acht `input_*`-Helfer sind bewusst **neu anzulegen**,
nicht bereits entdeckte Gerätesensoren. Nach Installation ihre Entity-IDs prüfen,
falls gleichnamige Helfer schon existieren. Private Dateien sind nicht im PR
enthalten und können bei Bedarf im lokalen Checkout eingesehen werden.

## Backend installieren

Das Frontend installiert das Backend nicht automatisch. Vor Änderungen die
betroffenen HA-Dateien sichern. Die folgende Anleitung beschreibt die
Installation per Paket oder über Helfer und Blueprint im HA-Editor.

1. [`blueprints/automation/mufflonbau/laundry_status.yaml`](../blueprints/automation/mufflonbau/laundry_status.yaml)
   nach `/config/blueprints/automation/mufflonbau/laundry_status.yaml` übernehmen.
   Alternativ den Blueprint aus seiner `main`-URL in HA
   importieren. Er ist für zwei Geräte wiederverwendbar und über Selektoren
   konfigurierbar.
2. Bei bereits eingerichteten HA-Packages das **private**
   `packages/laundry_status.local.yaml` nach
   `/config/packages/mufflonbau_laundry.yaml` kopieren. Ohne Packages die drei
   Erkennungshelfer plus den Bestätigungshelfer je Gerät über Einstellungen → Geräte & Dienste → Helfer anlegen:
   Auswahlhelfer mit Optionen `idle`, `starting`, `starting_after_finished`, `running`, `finishing`, `finished`
   in dieser Reihenfolge; drei Datum/Uhrzeit-Helfer mit Datum **und** Uhrzeit:
   `deadline`, `last_finished` und `acknowledged`.
   Danach zwei Automationen aus dem Blueprint erstellen und die echten
   Messentitäten sowie die jeweiligen Helfer auswählen. Helfer nie mit einem
   festen `initial` konfigurieren, damit Wiederherstellung erhalten bleibt.
   Neue „Zuletzt fertig“- und „Bestätigt“-Helfer einmalig auf `1970-01-01 00:00:00`
   setzen: HA initialisiert neue Datum-Helfer sonst mit dem heutigen Datum,
   das fälschlich als bisheriges Programmende erscheinen würde. Dies ist nur
   der Startwert beim Anlegen, kein festes `initial` für jeden Neustart.
3. Konfiguration in HA prüfen. Bei der erstmaligen Installation von YAML-Helfern
   kann ein HA-Neustart nötig sein; diesen bewusst einplanen. Automationen können
   separat neu geladen werden. Danach alle Helfer und beide Automationen prüfen.
4. Den `laundry:`-Abschnitt aus der persönlichen Strategie in die vorhandene
   Strategie übernehmen; nicht die vollständige bestehende Konfiguration ersetzen.
   Der Strategieeditor erwartet `type: custom:mufflonbau` oben, der vollständige
   Raw-Editor eine `strategy:`-Umschließung. Die Oberfläche zeigt bei fehlendem
   Backend ausdrücklich „Erkennung noch nicht eingerichtet“.

Ohne YAML-Packages bleiben die gleichen Einstellungen über Helfer und
Blueprint-Automationen in HA pflegbar. Eine komplette Paket-Neuinstallation und
manuell angelegte gleichnamige Helfer dürfen nicht parallel verwendet werden.

### Bestehende Installation aktualisieren

Den vorhandenen Blueprint unter seinem bisherigen Installationspfad durch die
aktuelle Version ersetzen. Je Gerät zusätzlich einen Datum/Uhrzeit-Helfer für
`acknowledged` anlegen und einmalig auf `1970-01-01 00:00:00` setzen. Bereits
vorhandene `last_finished`-Werte und Phasen beibehalten. Im jeweiligen
`laundry:`-Eintrag `acknowledged: input_datetime.<bestätigungshelfer>` ergänzen;
Waschmaschine und Trockner benötigen getrennte Bestätigungshelfer. Der Blueprint
benötigt dafür keine neuen Eingaben.

Ohne `acknowledged` bleibt die frühere Phasenbestätigung kompatibel; ein neuer
bestätigter Lauf ersetzt dann die alte Fertigphase. Mit `acknowledged` vergleicht
das Dashboard den letzten Abschluss mit dem bestätigten Abschluss. Ein alter
Bestätigungsklick kann dadurch eine inzwischen neu eingetroffene Fertigmeldung
nicht löschen. Bei mehreren unbestätigten Abschlüssen wird der jüngste angezeigt.
Der Zeitpunkt des letzten Abschlusses bleibt auch nach dem Bestätigen sichtbar.

## Erkennung und Wiederholschutz

Die Regel verarbeitet Leistungs-/Steckdosenänderungen, einen gespeicherten
Prüftermin und HA-Start/Automation-Neuladen; es gibt keine Polling-Schleife.

| Gerät | Start oberhalb | Startdauer | Ende unterhalb | Enddauer |
| --- | --- | --- | --- | --- |
| Waschmaschine | 10 W | 2 Minuten | 4 W | 10 Minuten |
| Trockner | 20 W | 2 Minuten | 4 W | 15 Minuten |

Dies sind **Startwerte zur Kalibrierung**, keine garantierte Kenntnis des
Programms. Die gelesenen Ausschnitte der tatsächlichen Historie zeigen reale
Lastzyklen, 0 W im Leerlauf und Verbindungsausfälle. Bei der Waschmaschine lag
eine Endphase bei ungefähr 3,2–3,5 W. Die Ausschnitte erlauben keine sichere
Bestimmung der längsten Programmpause für alle Programme. Prüft die ersten
vollständigen Wasch-/Trockenläufe und verlängert die Enddauer bei langen
Einweichpausen oder Knitterschutz. Ein abgebrochenes Programm mit geringem
Verbrauch lässt sich ohne nativen Programmstatus nicht sicher von „fertig“
unterscheiden. Es gibt deshalb keine erfundene Restzeit.

`idle → starting → running → finishing → finished` ist der gespeicherte Ablauf.
Ein kurzer Lastimpuls reicht nicht zum Scharfschalten; eine kurze Ruhephase
reicht nicht zur Fertigmeldung. Verbrauch oberhalb der Endschwelle setzt die
Endprüfung zurück. `unknown`, `unavailable`, negative/nichtnumerische Werte und
eine andere Einheit gelten niemals als 0 W. Nach einer unterbrochenen Messung,
HA-Neustart beginnt eine laufende Endprüfung vollständig von vorn. Ein reines
Automation-Neuladen übernimmt bei gültiger Messung den bestehenden Prüftermin.
Der vorher erkannte Lauf bleibt bei einer Sensorstörung erhalten; bei einer
ausgeschalteten/unerreichbaren Steckdose wird er sicherheitshalber verworfen.
Eine bereits gespeicherte Fertigmeldung bleibt sichtbar.
Auch kurze Lastimpulse nach Programmende, etwa beim Knitterschutz, löschen sie
nicht: Die zusätzliche gespeicherte Phase `starting_after_finished` behält
„Fertig“ bei, bis ein neuer Start über die gesamte Startdauer bestätigt ist.
Ihr Rückfall nach `finished` erzeugt keine weitere Meldung.

Die Phase `finished` wird **vor** den optionalen Meldeaktionen gespeichert.
Gleiche Messwerte, Attributänderungen, erneutes Laden der Startseite und
HA-Neustarts lösen damit keine weitere Meldung aus. Erst ein neuer bestätigter
Lauf kann erneut fertig werden. Bei einem Absturz genau zwischen Speichern und
Meldeaktion kann eine Nachricht ausfallen; sie wird absichtlich nicht nachgeholt,
um doppelte Meldungen zu vermeiden. Wiederherstellung ist keine transaktionale
Nachrichtenzustellung und hängt von HA's zuletzt gespeichertem Helferzustand ab.

## Tablet-Meldung

Die bestehende Companion-App-Aktion des Tablets wurde im Inventar beobachtet;
die private Paketdatei enthält sie in `completion_actions`. Es handelt sich um
eine normale Nachricht mit `channel: Mufflonbau Wäsche`, `importance: low` und
stabilem Tag pro Gerät. Der Android-Benachrichtigungskanal muss auf dem Tablet stumm eingestellt
sein; dessen bestehende Einstellungen haben Vorrang. Kein TTS, kein
Warnsignal, keine Lautstärkeänderung und kein Befehl zum Einschalten des Displays.
Die geteilte Paketvorlage sendet standardmäßig **keine** Nachricht. Die
Fertigmeldung auf der Startseite funktioniert unabhängig von der Tablet-App.
Die HA-Kachelbestätigung entfernt nur den Dashboard-Hinweis, nicht die bereits
zugestellte Android-Nachricht; diese kann am Tablet weggewischt werden.

## Prüfung und Rückbau

`npm run ci` prüft das gebaute Bundle, die YAML-Strategien, die Zustandsübergänge
des tatsächlich ausgelieferten Blueprint-Templates und die Browserinteraktion
einschließlich Live-Updates, Popup, Bestätigung und Tablet-/Handy-Breiten.
Das sind Simulationen, keine bestätigten Gerätezyklen. Eine Prüfung mit
Home Assistants laufendem Konfigurationsvalidator ist erst nach Installation der
Backend-Dateien möglich; der lokale Checkout hat kein HA-Python-Paket installiert.

Zum Rückbau `laundry:` aus der Strategie entfernen und die beiden Automationen
deaktivieren. Anschließend nur die acht neu angelegten Wäschehelfer bzw. das
Wäschepaket entfernen. Bestehende Shelly-Entitäten bleiben erhalten.

Referenzen: [Blueprint-Schema](https://www.home-assistant.io/docs/blueprint/schema/),
[Input Select und Wiederherstellung](https://www.home-assistant.io/integrations/input_select/),
[Input Datetime](https://www.home-assistant.io/integrations/input_datetime/),
[Companion-Benachrichtigungskanäle](https://companion.home-assistant.io/docs/notifications/notifications-basic/#notification-channels).

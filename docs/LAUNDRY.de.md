# Wäschekammer · Testversion

Die optionale Wäschekammer ergänzt die Startseite um eine kompakte Zeile. Tippen
öffnet die Details in einem Dialog mit großen Tasten. Ein erkanntes Programmende
bleibt als „Fertig · Wäsche wartet“ sichtbar, bis ihr „Wäsche erledigt“ bestätigt
oder ein neuer Lauf erkannt wird. Die Bestätigung ändert nur den neuen
Phasenhelfer. Waschmaschine und Trockner werden niemals geschaltet.

Feature-Branch: `feature/laundry-status`, HACS-Testversion: `v0.2.0-laundry.1`.
Nach Veröffentlichung: HACS → Mufflonbau → Neu herunterladen → Andere Version →
diese Testversion wählen und den Browser neu laden. Das Frontend allein erstellt
keine Helfer oder Automationen; die folgenden Schritte sind zusätzlich notwendig.
Die Testversion baut auf `main` auf und benötigt das Wetterfeature nicht.

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
synthetische Geräte-IDs. Die sechs `input_*`-Helfer sind bewusst **neu anzulegen**,
nicht bereits entdeckte Gerätesensoren. Nach Installation ihre Entity-IDs prüfen,
falls gleichnamige Helfer schon existieren. Private Dateien sind nicht im PR
enthalten und können bei Bedarf im lokalen Checkout eingesehen werden.

## Backend installieren

Das Frontend installiert das Backend nicht automatisch. Vor Änderungen die
betroffenen HA-Dateien sichern. Die folgende Anleitung beschreibt die
Installation per Paket oder über Helfer und Blueprint im HA-Editor.

1. [`blueprints/automation/mufflonbau/laundry_status.yaml`](../blueprints/automation/mufflonbau/laundry_status.yaml)
   nach `/config/blueprints/automation/mufflonbau/laundry_status.yaml` übernehmen.
   Alternativ den Blueprint nach Veröffentlichung aus seiner Branch-URL in HA
   importieren. Er ist für zwei Geräte wiederverwendbar und über Selektoren
   konfigurierbar.
2. Bei bereits eingerichteten HA-Packages das **private**
   `packages/laundry_status.local.yaml` nach
   `/config/packages/mufflonbau_laundry.yaml` kopieren. Ohne Packages die drei
   Helfer je Gerät über Einstellungen → Geräte & Dienste → Helfer anlegen:
   Auswahlhelfer mit Optionen `idle`, `starting`, `starting_after_finished`, `running`, `finishing`, `finished`
   in dieser Reihenfolge; zwei Datum/Uhrzeit-Helfer mit Datum **und** Uhrzeit.
   Danach zwei Automationen aus dem Blueprint erstellen und die echten
   Messentitäten sowie die jeweiligen Helfer auswählen. Helfer nie mit einem
   festen `initial` konfigurieren, damit Wiederherstellung erhalten bleibt.
   Die beiden neuen „Zuletzt fertig“-Helfer einmalig auf `1970-01-01 00:00:00`
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
HA-Neustart oder Neuladen beginnt eine laufende Endprüfung vollständig von vorn.
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
deaktivieren. Anschließend nur die sechs neu angelegten Wäschehelfer bzw. das
Wäschepaket entfernen. Bestehende Shelly-Entitäten bleiben erhalten.

Referenzen: [Blueprint-Schema](https://www.home-assistant.io/docs/blueprint/schema/),
[Input Select und Wiederherstellung](https://www.home-assistant.io/integrations/input_select/),
[Input Datetime](https://www.home-assistant.io/integrations/input_datetime/),
[Companion-Benachrichtigungskanäle](https://companion.home-assistant.io/docs/notifications/notifications-basic/#notification-channels).

# iCloud-Einkaufsliste testen

Branch: `feature/icloud-shopping` · HACS-Testversion: `v0.2.0-shopping.1`.
Dieser Branch enthält die Einkaufsfunktion auf Basis des stabilen Saugfried-Fixes.
Er benötigt weder Bubble Card noch das noch ungemergte Wetter-Paket.

Die vorhandene Liste **Einkaufsliste** wurde im Live-Inventar als aktive
`todo`-Entität der Integration **icloud** gefunden. Ihre Funktionsmaske `119`
enthält Hinzufügen, Aktualisieren und Entfernen. `todo.add_item` und
`todo.update_item` sind registriert. `todo.get_items` wurde lesend aufgerufen
und hat die vorhandenen offenen Einträge geliefert. Es wurde kein Testartikel
in die echte iCloud-Liste geschrieben und nichts abgehakt oder gelöscht.
Eine zweite Liste mit anderem Namen wurde nicht ausgewählt.

Die konkrete private Zuordnung liegt in `examples/icloud-shopping.local.yaml`;
das gelesene Inventar in `debug/icloud-shopping-before.local.json`. Beide Dateien
bleiben aus Git ausgeschlossen. Die Strategie enthält:

```yaml
shopping:
  entity: todo.family_shopping
  name: Einkaufsliste
```

`todo.family_shopping` ist hier ausschließlich ein synthetisches Beispiel.
Für die eigene Instanz die bereits entdeckte ID aus der lokalen Strategie benutzen.
Im Strategie-Editor steht `type: custom:mufflonbau` oben; im vollständigen
Raw-Dashboard-Editor gehört die Strategie unter `strategy:`.

Die Startseite erhält eine kompakte Karte mit der tatsächlichen Zahl offener
Einträge und einem Eingabefeld. „Hinzufügen“ oder Enter sendet genau einen
`todo.add_item`-Aufruf an die konfigurierte Liste. Leerer Text und paralleles
Absenden sind gesperrt. Bei einem Fehler bleibt der eingegebene Text erhalten.
Der Zähler wird ausschließlich aus Home Assistant gelesen; die Oberfläche
erfindet keinen sofortigen iCloud-Synchronisationsstand. Änderungen in iCloud
können abhängig von der vorhandenen Integration zeitversetzt eintreffen.

Ein Tippen auf den Listentitel öffnet die vorhandene HA-Navigation zu einer
Unteransicht mit der nativen To-do-Karte. Dort sind Hinzufügen und Abhaken
aktiviert; erledigte Einträge bleiben ausgeblendet. Die native Karte verwendet
die von der Integration unterstützten Fähigkeiten und Aktualisierungen.
Es wird keine neue lokale Einkaufsliste und keine Kopie in einem zweiten
Dienst angelegt. Bei fehlender oder nicht verfügbarer Entität bleibt der Fehler
sichtbar, statt die Liste als leer anzuzeigen.

Zum Testen den Pre-Release in HACS über „Neu herunterladen → Andere Version“
auswählen, den Browser neu laden und die lokale Test-Strategie in einem
Test-Dashboard verwenden. Es sind keine zusätzlichen Backend-Pakete oder neuen
Integrationen erforderlich. Zum Zurückwechseln den stabilen Release auswählen.
Pro HACS-Ressource ist jeweils eine Version geladen; die anderen getrennten
Feature-Branches werden dadurch nicht automatisch mitinstalliert.

Prüfung: `npm run ci` umfasst Bundle, YAML-Beispiele, Unit- und Browser-Tests.
Der Browser-Test prüft Enter, exaktes Ziel, Leertext, Fehler, erhaltene Eingabe,
Live-Zähler und Doppelklick-Schutz mit synthetischen Daten und Service-Stubs.
Die Galerie verwendet für die native HA-Karte einen Platzhalter. Die erste
echte Ergänzung und ihre iCloud-Synchronisation werden im Benutzertest geprüft.

Quellen: [HA To-do-Karte](https://www.home-assistant.io/dashboards/todo-list/),
[HA To-do-Aktionen](https://www.home-assistant.io/integrations/todo/).

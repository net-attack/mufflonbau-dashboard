# Räume und Reinigungsmodi prüfen

Ein Raumklick startet die unter `rooms[].cleaning` hinterlegte Aktion. Der
Dashboard-Raumname korrigiert keine falsche Raum-ID in einer HA-Automation.
Saugen, Wischen und CleanGenius brauchen jeweils eine passende Raumaktion.

Vor einer Reparatur die aktuelle Dashboard-, Skript- und Automationskonfiguration
sichern. Die aktuelle Roboterkarte mit der Bereichszuordnung unter den
Einstellungen der Vacuum-Entität vergleichen. Anschließend alle Automationen und
Skripte kontrollieren, die die Raumhelfer verwenden. Numerische Segment-IDs aus
einer alten Karte können inzwischen einen anderen Raum auswählen.

Wenn die Integration Bereiche unterstützt, `vacuum.clean_area` mit dem
bestätigten HA-Bereich in `data.cleaning_area_id` verwenden. Eine neue Karte
erfordert weiterhin eine Prüfung dieser Zuordnung. Niemals auf `vacuum.start`
oder eine leere Raumauswahl ausweichen, wenn ein Raum fehlt.

## Dreame: Modi ausdrücklich setzen

Die genauen Entitäten und Optionen aus der verbundenen Instanz lesen. Für
manuelle Raumaufträge gilt bei Geräten mit CleanGenius:

1. CleanGenius ausschalten. Solange es aktiv ist, können manuelle Selektoren
   nicht verfügbar sein.
2. Warten, bis der Modus-Selektor verfügbar ist. Benutzerdefinierte Raumreinigung
   ausschalten, damit gespeicherte Raumvorgaben den gewählten Modus nicht ändern.
3. Für **Saugen** `sweeping`, für **Wischen** `mopping` wählen, sofern diese
   Optionen vom Gerät angeboten werden. `mopping_after_sweeping` führt beide
   Schritte aus und gehört nicht zur reinen Wischaktion.
4. Den gemeldeten Modus bestätigen, dann ausschließlich den zugeordneten Bereich
   starten. Bei fehlender Bestätigung abbrechen.

Für **CleanGenius** ausdrücklich die gewünschte Routine aktivieren und
`mop_after_vacuum` wählen, wenn erst gesaugt und danach gewischt werden soll.
Danach denselben bestätigten Bereich starten.

Das folgende Beispiel gehört in den YAML-Editor eines HA-Skripts. Alle IDs sind
synthetisch und müssen durch beobachtete Entitäten und Bereiche ersetzt werden.
Es zeigt ausschließlich Wischen:

```yaml
alias: Badezimmer nur wischen
mode: single
sequence:
  - action: select.select_option
    target:
      entity_id: select.robot_cleangenius
    data:
      option: "off"
  - wait_template: >-
      {{ 'mopping' in (state_attr('select.robot_cleaning_mode', 'options') or [])
         and has_value('switch.robot_customized_cleaning') }}
    timeout: "00:00:20"
    continue_on_timeout: false
  - action: switch.turn_off
    target:
      entity_id: switch.robot_customized_cleaning
  - action: select.select_option
    target:
      entity_id: select.robot_cleaning_mode
    data:
      option: mopping
  - wait_template: >-
      {{ is_state('select.robot_cleangenius', 'off')
         and is_state('switch.robot_customized_cleaning', 'off')
         and is_state('select.robot_cleaning_mode', 'mopping') }}
    timeout: "00:00:20"
    continue_on_timeout: false
  - action: vacuum.clean_area
    target:
      entity_id: vacuum.robot
    data:
      cleaning_area_id:
        - bathroom
```

`wait_template` prüft auch einen bereits erreichten Zustand. Ein reiner
Zustandswechsel-Trigger würde bei unverändertem Modus bis zum Timeout warten.

Kurze Raumskripte direkt in der Dashboard-Konfiguration hinterlegen:

```yaml
cleaning: # innerhalb des Raums
  vacuum: script.bathroom_vacuum
  mop: script.bathroom_mop
  clean_genius: script.bathroom_clean_genius
```

Das Dashboard ruft die benannte Skriptaktion auf und wartet auf deren Rückkehr.
Fehler beim Einstellen des Modus erscheinen dadurch auf der Karte; währenddessen
sind weitere Raumstarts und Moduswechsel gesperrt. Das Skript soll nach dem
Startbefehl enden und nicht die komplette physische Reinigung abwarten.
Bestehende `input_button`-Helfer bleiben unterstützt; deren Automationen laufen
asynchron und können Fehler erst in ihren HA-Traces zeigen.

Konfigurationen nach dem Speichern erneut aus HA lesen und vergleichen. Die
Prüfung von Zuordnung und Konfiguration startet keine physische Reinigung.

Die native Bereichsaktion ist in der
[HA-Dokumentation](https://www.home-assistant.io/integrations/vacuum/#action-vacuumclean_area)
beschrieben; die tatsächlich unterstützten Dreame-Aktionen und Optionen müssen
aus der installierten Integration gelesen werden.

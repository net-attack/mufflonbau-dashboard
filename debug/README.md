# Local Home Assistant inventory

1. Paste [the diagnostic template](../examples/diagnostics-template.jinja) into
   Home Assistant Developer Tools > Template.
2. Copy its JSON result into `debug/ha-inventory.local.json` in this repository.
3. Tell the developer that the file is ready.

Set-valued attributes (such as supported color modes) are normalized recursively
to JSON arrays, preserving nested group members and diagnostics.

The query reads states, area/device assignments, light-group membership
(`attributes.entity_id`), device capabilities, vacuum status/error attributes,
and related sensors/helpers. It does not execute device actions. Only selected
attributes are exported; camera access tokens, URLs, and config-entry credentials
are not requested. Names, room assignments, and sensor readings are still local
installation data. `debug/*.local.json` is excluded from Git.

Entities absent from HA's state machine, including disabled entities without a
state, are not listed. This is an inventory snapshot, not a connection test. The
dashboard reads HA states and calls HA services; it has no separate Nanoleaf or
vacuum device API. A working integration with a renamed entity can therefore
require updating the dashboard configuration.

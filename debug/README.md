# Local Home Assistant inventory

1. Paste [the diagnostic template](../examples/diagnostics-template.jinja) into
   Home Assistant Developer Tools > Template. Keep `section = 'lights'` and
   `offset = 0` for the first export.
2. Copy the compact JSON result into `debug/ha-lights-0.local.json`.
3. If `has_more` is true, replace `offset = 0` in the template with the returned
   `next_offset` value, run again, and save another file using that offset in its name.
4. Set `section = 'vacuum'` and reset `offset = 0`. Save those results to
   `debug/ha-vacuum-0.local.json` (and further pages if needed).
5. Tell the developer when the files are ready. Use `section = 'sensors'` only if
   a broader sensor/climate inventory is needed later.

Light exports contain real IDs, states, group membership, area/device assignments,
and capabilities. Vacuum exports contain vacuum entities, helpers, scripts,
cameras, selects, and sensors attached to the vacuum's device. Exports do not
execute actions. Only selected attributes are included; camera access tokens,
URLs, and config-entry credentials are not requested. The JSON files contain
local installation data and are excluded from Git.

Each page contains at most 40 entities and an entity-data budget below 160,000
characters, leaving headroom below HA's 262,144-character template limit.
Output whitespace is stripped and JSON is compact. Resume with `next_offset`,
not by assuming that every page contained 40 entities.

The export uses no recursion. Scalars, flat collections, and one mapping level
are retained; deeper structures receive an explicit omission marker. Long scalar
values are limited to 500 characters, collections to 200 items, and mappings to
30 fields. Oversized attribute payloads receive an export note instead of blocking
the whole page. These bounds are intended for diagnostics, not a complete backup.
Group member IDs and ordinary vacuum errors remain available for normal entities.

Entities absent from HA's state machine, including disabled entities without a
state, are not listed. This is a state snapshot, not a physical connection test.
The dashboard uses HA states/services rather than a separate Nanoleaf/vacuum API.


For the Admin panel, use `section = 'network'` and reset `offset = 0`.
This includes network device trackers plus sensors, binary sensors and switches
for router, speed-test and host readings. Save each page as
`debug/ha-network-OFFSET.local.json` and continue using `next_offset`.
The export includes reported IP/SSID/interface attributes; keep these local.
Disabled System monitor entities must be enabled before they can appear here.

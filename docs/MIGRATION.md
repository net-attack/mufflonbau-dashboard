# Migrating the old dashboard

The local reference `old/dashboard.yaml` contains a single large dashboard using
Button Card templates, Bubble Card popups, Card Mod, and Kiosk Mode. Its functionality
is separated into reusable features rather than carrying the template expressions
and duplicated installation-specific entity lookups into the new source.

| Previous behavior | Replacement |
| --- | --- |
| Header clock, date, weather, calendar summary | Designed hero with weather/event summary and a dedicated weekly calendar view |
| Presence tiles | Custom presence cards configured through `people` |
| Five room climate summaries | Shared room definitions and live climate cards |
| Light groups and individual room devices | Room `lights` and `entities`, using native tiles |
| SVG room click targets and live readings | Configurable schematic floorplan and room subviews |
| Room-specific popup controls | Room detail subviews using the same room configuration |
| Vacuum status, battery, room, map | Native vacuum tile, entity summary, and camera card |
| Vacuum/mop helper buttons per room | Explicit `input_button.press` actions in room `cleaning` |
| Duplicated low-battery/offline templates | One monitor rule and live system warnings |
| System popup | System view with both warnings and monitored entities |
| Climate placeholder | Per-room live values, native sensor details, and 24-hour history |
| Expert placeholder | Deduplicated inventory of configured entity IDs |
| Presence-based ambient/night palette | Configurable shared appearance rule |
| Floating popup navigation | Desktop sidebar and compact mobile bottom navigation |
| Kiosk header hiding | Configured separately by the dashboard owner; never enabled by the strategy |

The floorplan is a schematic built from room rectangles and live overlays. Room
positions from the old plan are retained in the local migration configuration;
decorative furniture, door arcs, and window illustrations are not copied into the
runtime. This keeps room geometry editable as data. Room names and notes can use
English/German label objects. Entity IDs are never translated or silently corrected.

When `examples/mufflonbau.local.yaml` is present, paste its complete contents into
**Edit dashboard → strategy YAML configuration**, without an outer `strategy:`
key. For a full raw dashboard configuration, nest it under `strategy:` instead.
Do not use a card editor.

The migration preserves all six room control groups, cleaning helper IDs,
calendar/weather/presence IDs, overview-only lights, and thirteen monitored sensor
IDs. Existing office cleaning helper IDs retain their original spelling. Verify
those IDs in Developer Tools → States if their actions do not work. Existing notes
that did not identify a device unambiguously remain notes rather than guessed
entity assignments.

The local reference and generated personal example are excluded from Git. The
public `examples/strategy.yaml` uses illustrative IDs and must be customized.
No actual devices were controlled during migration or tests. Confirm map access,
cleaning helper behavior, calendar data, sensor units, history, and phone/tablet
navigation in the real Home Assistant instance after updating the HACS resource.

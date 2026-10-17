# Mufflonbau Dashboard

A modular Home Assistant dashboard with English and German UI, distributed through
HACS as one JavaScript resource. It includes room navigation and a live schematic
floorplan, lights, climate readings and history, presence, calendar, weather,
robot cleaning controls, and battery/offline monitoring.

## Installation

Requirements: Home Assistant 2026.5 or newer and HACS. Real-instance verification
of this expanded version is still pending; browser checks use simulated HA states.

1. Add `https://github.com/net-attack/mufflonbau-dashboard` as a custom HACS
   repository of type **Dashboard** and download it.
2. Verify that `/hacsfiles/mufflonbau-dashboard/mufflonbau-dashboard.js` is registered
   as a **JavaScript module** resource, then reload the browser.
3. Create a dashboard using the **Mufflonbau** community strategy.
4. Open **Edit dashboard** and paste the following into the **strategy configuration**
   YAML editor. This editor expects `type` at the top level:

```yaml
type: custom:mufflonbau
title: Mufflonbau
language: auto
entities: []
```

For an existing dashboard's **full raw configuration editor**, wrap that configuration
under `strategy:` instead. See [examples/dashboard.yaml](examples/dashboard.yaml).
Do not paste a dashboard strategy into a card editor: it is not a custom card.

In HACS, use **Update information** before **Redownload** if a newer commit does
not appear. Reload the browser after downloading.

## Design

Choose a design through `appearance.theme`, independently of its light/dark mode:

| Theme | Appearance |
| --- | --- |
| `atmospheric` | Blue-gray atmosphere, translucent panels, pastel room tiles, large room symbols, circular light controls |
| `storybook` (default) | Cream, sage, honey yellow, and an original illustrated landscape with houses, balloon, bee, and fox |
| `calm` | The earlier neutral/sage design with a desktop sidebar |

For the illustrated family theme, merge these options into your existing strategy
configuration; keep your existing rooms and entities:

```yaml
appearance:
  theme: storybook
  mode: ambient
```

For the dark dashboard inspired by the reference:

```yaml
appearance:
  theme: atmospheric
  mode: night
```

Use `mode: auto` (the default) to follow `sun.sun`: Ambient while the sun is above
the horizon, Night after sunset. Without a usable sun state, the HA theme is used.
All three themes have matching light and dark palettes, including native detail
cards. No global Home Assistant theme is changed. The original vector illustration
is bundled locally; the dashboard does not download reference images or fonts.
See [examples/storybook.yaml](examples/storybook.yaml) for a complete generic example.

The home view combines greeting/date, current weather readings, indoor climate
averages, and calendar summaries with compact buttons for rooms, presence,
cleaning, and system checks. Buttons show a short live status and open their
detailed views. Climate averages include available numeric sensors with matching units.
German dashboards choose a playful greeting from a rotating family/Smart-Home
pool. The choice stays stable during live state updates and changes with a new
day period or card instance.
Room symbols use the configured icon or recognizable room ID. Tap a circular bulb
to toggle its configured light; use the arrow for room details. The detailed
calendar and history remain in their own views. The illustrated theme is a visual
preset and does not change device permissions or actions.

## Configuration

Start with [examples/strategy.yaml](examples/strategy.yaml) for the expanded
configuration. Replace its example entity IDs with your real IDs. All feature
sections are optional; omitted sections generate no corresponding view.

| Option | Purpose |
| --- | --- |
| `title` | Dashboard title; default `Mufflonbau` |
| `language` | `auto` (HA profile), `en`, or `de`; unsupported profile languages use English |
| `entities` | Favorite entities on the home view; preserves the original minimal configuration |
| `people` | Presence cards with translated states |
| `weather` | Optional weather entity |
| `calendars` | Calendar entities for the header summary and native calendar |
| `rooms` | Room definitions, detailed below |
| `cleaning` | Optional `entity` (vacuum), `battery`, `current_room`, and `map` (camera) IDs |
| `monitors` | Objects containing `entity`, optional `name`, and optional `battery_below` threshold |
| `admin` | Optional arrays of entity IDs in `internet`, `network`, `host`, and router-backed `clients` |
| `kiosk_mode` | Kiosk Mode settings; defaults to `kiosk: true`, `hide_header: true` |
| `expert_entities` | Additional entities to include in the expert view |
| `appearance` | `theme: storybook` (default), `atmospheric`, or `calm`; `mode: auto` (default), `ambient`, or `night` |

Each room has a unique stable `id` (lowercase slug) and a `name` (string or
`{en: ..., de: ...}`). Optional fields: `icon`, `temperature`, `humidity`,
`dew_point`, `lights` (IDs), `entities` (IDs), and `note` (string or translated label).
`position: {x: 0, "y": 0, width: 300, height: 180}` places the room in the schematic floorplan.
For non-rectangular rooms, use `position.points: [[0, 0], [300, 0], [300, 180], [0, 180]]`
or `position.parts` for multiple polygons. `floorplan_walls` contains polylines in
the same coordinate system. Wall extents are included in the view, including
outlines such as balconies. Installation-specific geometry stays in the ignored local YAML.
Always quote the `"y"` key in YAML: HA's YAML 1.1 editor otherwise reads it as
boolean `true`. Previously saved configurations with that converted key are
recovered automatically.
Without a position it gets an automatic grid position. Use consistent coordinate
units when combining manual positions. Room details are HA subviews linked from
the floorplan and room overview.

A room's `cleaning` object maps `vacuum`, `mop`, and optionally `clean_genius` to
**existing input_button helpers or scripts**. Choose Saugen, Wischen, or CleanGenius
above the room list, then tap a room to start that action directly, without a dialog.
Input buttons call `input_button.press`; scripts call `script.turn_on` on the exact
configured entity. Unconfigured modes and unavailable helpers stay disabled.
The CleanGenius helper/script must set the device's CleanGenius mode and start the
intended room; the dashboard does not infer Dreame segment IDs or select options.

```yaml
cleaning: # inside a room definition
  vacuum: input_button.vacuum_living
  mop: input_button.mop_living
  clean_genius: script.clean_genius_living
```

No automations or helpers are created. The native vacuum tile adds start/pause,
stop, and return-home controls where supported by the vacuum.

While cleaning or paused, the cleaning page and Home summary show the robot's
reported cleaning type (vacuum, mop, combined cleaning or CleanGenius). Changing
the room-action selector does not change this live display. If the integration
does not report a cleaning type, the dashboard says so rather than inferring it.

Monitors flag missing, `unknown`, and `unavailable` entities. With `battery_below`,
invalid numeric readings also count as unavailable; values strictly below the
threshold generate a battery warning. Values equal to the threshold are healthy.
Warnings update with HA states without regenerating the dashboard. Battery
sensors are checked at a 20% threshold by default; set `battery_below` to
override it. Healthy readings stay hidden. Tap a warning or a climate tile to
open HA's entity details.

System checks group monitored readings by Home Assistant device. If a device's
monitored readings are all unavailable, it produces one “Unreachable” warning
instead of separate temperature, humidity and battery errors. The overview counts
devices too. Individual battery or measurement problems remain visible when the
device still reports other readings. Without registry information, entities stay
separate until Home Assistant supplies their device assignments.

The admin view automatically discovers common Speedtest/WAN sensors, router
network sensors, router-backed device trackers, and Home Assistant/Raspberry Pi
processor, memory, disk, and uptime sensors. Add explicit IDs under `admin` when
an entity uses an unusual name. Fritz DECT temperature and battery sensors are
not treated as Internet metrics. Network presence is reported by the router's
device tracker and may be delayed; it does not identify Wi-Fi versus Ethernet
unless the integration exposes that detail. The expert view also includes the
discovered admin entities.

By default, appearance follows `sun.sun`, with the HA dark theme as a fallback.
An explicit `mode: ambient` or `mode: night` overrides automatic selection.
The earlier `night_person` and `ambient_person` options are accepted for configuration
compatibility but no longer affect the mode. The same palette applies to native
detail cards inside the dashboard; no global HA theme is changed.

Set `language: auto` to follow your HA profile; reload the dashboard after changing
the profile language. Custom titles and entity names stay as configured. Optional
`dew_point` references an existing sensor; the dashboard does not create derived sensors.

## Migrating a local dashboard

[docs/MIGRATION.md](docs/MIGRATION.md) maps the old dashboard's behavior to these
modules. The local `old/` input and `examples/*.local.yaml` are ignored by Git so
installation-specific entity IDs and floorplans stay local. When present,
`examples/mufflonbau.local.yaml` can be pasted directly into the strategy editor.

### Interactive room map

Optional `floorplan_drawing` describes furniture, windows and wall openings using
safe vector shapes (`g`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`,
`text`). Each shape has `tag`, optional `attrs`, `children`, and text shapes may
have `text`. Use theme colors `wall`, `floor`, `furniture`, `cushion`, `wood`,
`water`, `light`, `radiator`, or `none` for `fill` and `stroke`. HTML, scripts,
images and external SVG resources are not supported. Personal drawings belong
in the ignored local YAML, not in the shared JavaScript bundle.

`floorplan_bounds: [x, y, width, height]` includes exterior areas such as a balcony.
`floorplan_objects` places devices at absolute map coordinates, including negative
coordinates outside the apartment. Each object needs a unique `id`, configured
`room`, `name`, supported `icon`, and `position: {x: 10, "y": 20}`. Optional
`entity` and `action: toggle` / `more-info` connect verified HA entities.
`kind: window` displays a binary contact as open/closed; `kind: temperature`
displays a temperature reading. Unassigned devices remain explicitly unconfigured;
the dashboard never guesses their entity IDs or sensor values.
For lights disconnected by a conventional wall switch, set `wall_switch: true`
on that map device. An `unavailable` light then shows a neutral “wall switch may
be off” hint and remains uncontrollable until HA reports it reachable again.
This is not a measured switch state; missing/unknown entities, sensors, and
lights without this explicit option retain their normal availability messages.

The map includes room selection, zoom, per-room temperature/humidity labels,
device details, and a touch-friendly device list. Room links open a focused map
and existing room controls. `room.label_position: {x: 0.5, "y": 0.5}` moves the
climate label within the room bounds to avoid furniture. Missing readings show
an em dash, never a fabricated zero. Existing simple floorplans remain supported.

The Rooms overview dedicates the available screen to the map. Drag to pan and
pinch with two fingers to zoom; trackpad pinch and the +/−/reset buttons work too.
Zoom and position survive live entity updates. The cleaning camera uses the same
gesture controls; ordinary mouse-wheel scrolling still reaches the page.
Tap empty space outside the floorplan to return Home. Rooms, Presence, Climate,
Cleaning and System check also provide a Home link or background shortcut;
dragging the map and selecting a device never activate the background shortcut.
Climate readings share a compact grid of square room tiles, with history below.
Presence uses the page width for person cards; System check shows monitored,
healthy and warning counts above its warning grid.

Disabled room cleaning buttons show whether their configured helper is missing
or unavailable, including its entity ID. A never-pressed `input_button` has an
`unknown` timestamp and remains usable; an unknown script remains disabled.
Modes without a configured room action show a setup hint. CleanGenius requires a real per-room helper or script;
the dashboard cannot infer the vacuum's integration-specific settings.

The dashboard needs no Button Card, Bubble Card, or Card Mod resources.
Kiosk Mode requires the separately installed Kiosk Mode plugin. By default this
dashboard enables kiosk mode and hides the Home Assistant header. Set
`kiosk_mode: {kiosk: false, hide_header: false}` to override it; the strategy
does not hide the sidebar unless you also set `hide_sidebar: true`.

## Diagnosing entity and room assignments

Paste [examples/diagnostics-template.jinja](examples/diagnostics-template.jinja)
into Home Assistant Developer Tools > Template. Export `section = 'lights'`
first and then `section = 'vacuum'`, resetting `offset = 0` for each section.
Save results as ignored `debug/ha-lights-0.local.json` and
`debug/ha-vacuum-0.local.json`. If `has_more` is true, continue using the returned
`next_offset` value. The compact, size-bounded pages include real entity IDs,
states, area/device mappings, light-group members, capabilities, and vacuum errors.
See [debug/README.md](debug/README.md) for export details.

The dashboard uses Home Assistant's entity states and services, without a separate
Nanoleaf/vacuum API. Missing entity IDs, `unknown` states, `unavailable` states, and
invalid numeric sensor values are displayed separately. Problematic device cards
show their configured ID so a renamed entity can be identified. An `off` light is
available and can be controlled. Missing or unavailable states are not evidence
that the physical device itself is offline.

## Development

Node.js 22 or newer. esbuild is a development dependency; the dashboard has no
runtime package dependencies:

```sh
npm ci
npm run build
npm run check
npm test
```

Edit `src/`, then rebuild the committed `mufflonbau-dashboard.js` HACS entry point.
The check command rejects a stale bundle. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
for module boundaries and extension instructions.

The same complete check runs locally and in GitHub Actions:

```sh
npm ci
python3 -m pip install -r test/requirements.txt
npx playwright install chromium
npm run ci
```

`npm run ci` checks bundle freshness and syntax, runs unit tests and the actual
YAML examples through the Home Assistant 2026.10.1 frontend parser (`js-yaml`
5.4.2 with `YAML11_SCHEMA`), renders the diagnostic export in a sandboxed Jinja environment with simulated HA
helpers (including set-valued and nested attributes), then tests the shipped
bundle in Chromium. If local
`examples/*.local.yaml` files exist, they are checked too; they stay excluded
from Git and are not uploaded to GitHub.

Browser checks cover live state updates, English/German text, battery warnings,
entity detail events, floorplan links, mobile overflow, safe labels, clock cleanup,
rendering of the actual YAML examples, consistent surface colors, complete
desktop/mobile layouts for all six theme/mode combinations, light toggles, and action failures. Galaxy Tab A11 coverage exercises
1340 × 800 / 800 × 1340 at DPR 1 and an additional 893 × 533 / 533 × 893 profile at DPR 1.5.
The actual tablet's browser viewport and DPR have not been measured. Checks include
touch input, horizontal overflow, scrolling, card geometry, navigation placement,
44 x 44 CSS pixel touch targets, and unobstructed access to the last card. Every
theme/mode combination also checks palette propagation and WCAG 4.5:1 contrast
for its primary text roles. GitHub Actions runs on every push and
pull request, installs Chromium and its system dependencies, and retains browser
screenshots as artifacts for seven days. Screenshots are written to the ignored
`test-results/` directory. `npm run test:browser` runs just the browser checks.
Every generated view, including every room, is rendered in both orientations and
Ambient/Night for both Galaxy profiles. Open `test-results/views/index.html` for
the filterable gallery; `manifest.json` lists all captures. Geometry checks catch
horizontal overflow, empty cards, obscured content, and cleaning-panel overflow.
The portrait home view also checks that all four summary buttons have equal width.

The browser harness uses simulated HA states, not a full Home Assistant server.
Native card behavior, HACS installation, and real cleaning actions still require
verification in your installation. Choose a license before the first tagged release.

## References

- [Home Assistant dashboard strategies](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-strategy/)
- [Native card features](https://www.home-assistant.io/dashboards/features/)
- [Dashboard actions](https://www.home-assistant.io/dashboards/actions/)
- [HACS dashboard requirements](https://www.hacs.xyz/docs/publish/plugin/)

### Admin / nerd panel

The **Admin** destination keeps technical data separate from the daily home overview.
Open Internet, Network, or Home Assistant / Raspberry Pi to see individual readings,
Recorder history (6 hours, 24 hours, or 7 days), and native entity details.
Select existing entity IDs under your dashboard's `strategy` configuration:

```yaml
admin:
  internet:
    - binary_sensor.your_router_connection
    - sensor.your_download_measurement
    - sensor.your_upload_measurement
    - sensor.your_ping_measurement
  network:
    - sensor.your_router_throughput
  clients:
    - device_tracker.your_tablet
  host:
    - sensor.your_processor_temperature
    - sensor.your_processor_use
    - sensor.your_memory_use_percent
    - sensor.your_disk_use_percent
```

These IDs are placeholders: replace them with your actual entities. Omit groups you
haven't configured yet; their detail pages explain how to add sources. No network
scan, speed test, or host polling is started by this dashboard.

Use router-backed device trackers for `clients`. Tracker presence may be delayed
and does not distinguish Ethernet from Wi-Fi. Open a device to inspect the
connection attributes actually supplied by your integration. Internet readings
include their update timestamp: a speed-test result is a measurement, not current
link throughput. The dashboard's own HA connection is never used to infer WAN
connectivity.

[System monitor](https://www.home-assistant.io/integrations/systemmonitor/) provides
host readings; enable the desired entities (disabled by default).
[FRITZ!Box Tools](https://www.home-assistant.io/integrations/fritz/) or your router's
integration can supply connectivity and device trackers. History requires Recorder
and read access to the selected sensors. Charts separate units and device classes,
preserve unknown/unavailable gaps, and refresh every five minutes while open.

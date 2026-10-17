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
| `atmospheric` (default) | Blue-gray atmosphere, translucent panels, pastel room tiles, large room symbols, circular light controls |
| `storybook` | Cream, sage, honey yellow, and an original illustrated landscape with houses, balloon, bee, and fox |
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

Use `mode: auto` for the existing HA theme/presence-based light/dark selection.
All three themes have matching light and dark palettes, including native detail
cards. No global Home Assistant theme is changed. The original vector illustration
is bundled locally; the dashboard does not download reference images or fonts.
See [examples/storybook.yaml](examples/storybook.yaml) for a complete generic example.

The home view combines greeting/date, current weather readings, indoor climate
averages, calendar summaries, live room tiles, lights, presence, cleaning, and
warnings. Climate averages include available numeric sensors with matching units.
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
| `expert_entities` | Additional entities to include in the expert view |
| `appearance` | `theme: atmospheric`, `storybook`, or `calm`; `mode: auto`, `ambient`, or `night` |

Each room has a unique stable `id` (lowercase slug) and a `name` (string or
`{en: ..., de: ...}`). Optional fields: `icon`, `temperature`, `humidity`,
`dew_point`, `lights` (IDs), `entities` (IDs), and `note` (string or translated label).
`position: {x: 0, "y": 0, width: 300, height: 180}` places the room in the schematic floorplan.
Always quote the `"y"` key in YAML: HA's YAML 1.1 editor otherwise reads it as
boolean `true`. Previously saved configurations with that converted key are
recovered automatically.
Without a position it gets an automatic grid position. Use consistent coordinate
units when combining manual positions. Room details are HA subviews linked from
the floorplan and room overview.

A room's `cleaning` object maps `vacuum` and/or `mop` to **existing input_button
helpers**. Pressing a button runs `input_button.press` on that exact entity.
No automations or helpers are created. The native vacuum tile adds start/pause,
stop, and return-home controls where supported by the vacuum.

Monitors flag missing, `unknown`, and `unavailable` entities. With `battery_below`,
invalid numeric readings also count as unavailable; values strictly below the
threshold generate a battery warning. Values equal to the threshold are healthy.
Warnings update with HA states without regenerating the dashboard. Tap a warning
or a climate tile to open HA's entity details. The system view also lists healthy
monitored devices. The expert view collects all referenced entities without duplicates.

By default, appearance follows the HA dark theme. To preserve presence-based
switching from an earlier installation, set `appearance.night_person` and
`appearance.ambient_person`: night mode is used when the first person is home and
the second is not home. An explicit `mode` overrides this rule. The same palette applies to native detail cards inside the dashboard; no global
HA theme is changed.

Set `language: auto` to follow your HA profile; reload the dashboard after changing
the profile language. Custom titles and entity names stay as configured. Optional
`dew_point` references an existing sensor; the dashboard does not create derived sensors.

## Migrating a local dashboard

[docs/MIGRATION.md](docs/MIGRATION.md) maps the old dashboard's behavior to these
modules. The local `old/` input and `examples/*.local.yaml` are ignored by Git so
installation-specific entity IDs and floorplans stay local. When present,
`examples/mufflonbau.local.yaml` can be pasted directly into the strategy editor.

The dashboard needs no Button Card, Bubble Card, or Card Mod resources.
The strategy does not enable kiosk mode or hide Home Assistant's header/sidebar,
including when an older strategy configuration still contains `kiosk_mode`.
Configure kiosk behavior separately in your dashboard settings when desired.
During development, keep the standard Home Assistant controls visible.

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
desktop/mobile layouts for all six theme/mode combinations, light toggles, and action failures. GitHub Actions runs on every push and
pull request, installs Chromium and its system dependencies, and retains browser
screenshots as artifacts for seven days. Screenshots are written to the ignored
`test-results/` directory. `npm run test:browser` runs just the browser checks.

The browser harness uses simulated HA states, not a full Home Assistant server.
Native card behavior, HACS installation, and real cleaning actions still require
verification in your installation. Choose a license before the first tagged release.

## References

- [Home Assistant dashboard strategies](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-strategy/)
- [Native card features](https://www.home-assistant.io/dashboards/features/)
- [Dashboard actions](https://www.home-assistant.io/dashboards/actions/)
- [HACS dashboard requirements](https://www.hacs.xyz/docs/publish/plugin/)

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

## Configuration

Start with [examples/strategy.yaml](examples/strategy.yaml) for the expanded
configuration. Replace its example entity IDs with your real IDs. All feature
sections are optional; omitted sections generate no corresponding view.

| Option | Purpose |
| --- | --- |
| `title` | Dashboard title; default `Mufflonbau` |
| `language` | `auto` (HA profile), `en`, or `de`; unsupported profile languages use English |
| `entities` | Favorite entities on the home view; preserves the original minimal configuration |
| `people` | Person entities displayed using native HA state translations |
| `weather` | Optional weather entity |
| `calendars` | Calendar entities for the header summary and native calendar |
| `rooms` | Room definitions, detailed below |
| `cleaning` | Optional `entity` (vacuum), `battery`, `current_room`, and `map` (camera) IDs |
| `monitors` | Objects containing `entity`, optional `name`, and optional `battery_below` threshold |
| `expert_entities` | Additional entities to include in the expert view |
| `appearance` | `mode: auto`, `ambient`, or `night`; applies to Mufflonbau live cards |
| `kiosk_mode` | Optional pass-through for the separately installed Kiosk Mode plugin |

Each room has a unique stable `id` (lowercase slug) and a `name` (string or
`{en: ..., de: ...}`). Optional fields: `icon`, `temperature`, `humidity`,
`dew_point`, `lights` (IDs), `entities` (IDs), and `note` (string or translated label).
`position: {x, y, width, height}` places the room in the schematic floorplan.
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
the second is not home. An explicit `mode` overrides this rule. Native HA cards
continue to follow your HA theme.

Set `language: auto` to follow your HA profile; reload the dashboard after changing
the profile language. Custom titles and entity names stay as configured. Optional
`dew_point` references an existing sensor; the dashboard does not create derived sensors.

## Migrating a local dashboard

[docs/MIGRATION.md](docs/MIGRATION.md) maps the old dashboard's behavior to these
modules. The local `old/` input and `examples/*.local.yaml` are ignored by Git so
installation-specific entity IDs and floorplans stay local. When present,
`examples/mufflonbau.local.yaml` can be pasted directly into the strategy editor.

The normal dashboard needs no Button Card, Bubble Card, or Card Mod resources.
Kiosk Mode remains optional: if already installed, `kiosk_mode` accepts boolean
`kiosk`, `hide_header`, and `hide_sidebar` flags. Without that plugin, omit the
option and HA's standard header/navigation remains visible.

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

Optional real-browser checks require Playwright and its Chromium browser:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node scripts/browser-check.mjs
```

The browser harness tests only Mufflonbau live cards with mock states, not a full
HA installation. Native card behavior and actual cleaning actions must be checked
in your installation. Choose a license and validate a complete HACS installation
before the first tagged release.

## References

- [Home Assistant dashboard strategies](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-strategy/)
- [Native card features](https://www.home-assistant.io/dashboards/features/)
- [Dashboard actions](https://www.home-assistant.io/dashboards/actions/)
- [HACS dashboard requirements](https://www.hacs.xyz/docs/publish/plugin/)

# Architecture

The source has three layers: validated configuration and pure helpers, view
modules that produce HA configuration, and a small stateful live card for values
that need to change without regenerating the strategy.

| Location | Responsibility |
| --- | --- |
| `src/core/config.js` | Normalize optional fields, validate nested paths, collect referenced IDs |
| `src/core/i18n.js` | English/German strings and profile/config language selection |
| `src/core/state.js` | Pure numeric, availability, warning, and appearance rules |
| `src/core/cards.js` | Small factories for native cards and view definitions |
| `src/modules/home.js` | Custom home composition: hero, presence, room cards, light switches, cleaning |
| `src/modules/rooms.js` | Room overview/subviews, climate summary and history |
| `src/modules/calendar.js` | Native weekly calendar in a dedicated view |
| `src/modules/cleaning.js` | Native vacuum/map cards and explicit input_button actions |
| `src/modules/system.js` | Live warnings, monitored entities, expert inventory |
| `src/cards/live-card.js` | Branded live cards, state displays, and light/switch controls |
| `src/cards/shell.js` | Full-width panel, desktop/mobile navigation, and native card hosting |
| `src/design/` | Theme palettes, component styles, bundled original vector scenery, DOM/icons, and navigation helpers |
| `src/strategy.js` | Compose enabled feature views from a single configuration |
| `src/index.js` | Idempotent custom element and HA strategy registration |
| `scripts/build.mjs` | Deterministic single-file HACS output |

## Data flow

The strategy normalizes the configuration, resolves the language, and supplies
`{config, hass, language, text}` to feature modules. Modules return card configurations. The strategy wraps each view in one custom
shell card and uses HA panel views, avoiding the native masonry column layout.
Every generated card and view has an explicit `type`.
No entity IDs, person names, battery limits, or room coordinates are embedded in
source code. Installation data belongs in the strategy configuration.

The strategy runs when HA requests it. It does not poll or call services while
building the dashboard. Native cards receive live states from HA. The custom live
card also receives `hass`; it rerenders when one of its referenced state objects,
the locale, or the theme changes. The header has a 30-second clock timer that is
cleared when disconnected. Entity detail requests use the HA `hass-more-info`
event; floorplan links use HA navigation and preserve normal modified link clicks.
The `appearance.theme` preset is independent of the ambient/night appearance rule.
Themes share the same modules, entity mapping, and actions; only semantic tokens
and presentation change. Reference imagery is never fetched by the runtime.

The shell hosts native detail cards via `window.loadCardHelpers()` and propagates
`hass`. All cards inherit the same semantic color tokens and HA card variables.
It does not modify global themes or reach into HA card shadow roots.
Text and SVG nodes are built with DOM APIs, not interpolated HTML from entity
attributes or configuration labels.

The old warning logic was duplicated between visibility and display templates.
`monitorWarnings` is now the single rule used for live warning content. Tests
cover missing entities, invalid numeric values, and the threshold boundary.
Room climate sensors and light entities are configured once and shared by home,
room details, climate, floorplan, and expert views.

## Extending the dashboard

1. Add any new fields and path-specific validation to `core/config.js`; include
   entity references in `collectEntities`.
2. Put UI labels in both dictionaries in `core/i18n.js`.
3. Add a feature module returning view configurations, then compose it in
   `strategy.js`. Prefer native HA cards when they provide the required behavior.
4. For custom live behavior, add a focused live-card mode or a separate custom
   element; declare every watched entity and clean up any timers/listeners.
5. Test the behavior and edge cases, run `npm run build`, `npm run check`, and
   `npm run ci`. The same check runs in GitHub Actions for pushes and pull requests.

esbuild bundles the standard ES modules into an IIFE, resolving imports and keeping
module scope independent. Its exact development version is pinned in the lockfile.
The check script builds in memory and compares the output with the committed
HACS file, so CI catches source edits without a corresponding bundle update.
YAML example tests use HA's YAML 1.1 schema before generating the dashboard,
including any ignored local examples present on disk. This catches YAML scalar
and key coercion that direct JavaScript fixtures cannot reveal. The configuration
normalizer also recovers `position.true` as `position.y` for configurations saved
with an unquoted YAML `y` key. New examples quote the key explicitly.

HACS receives one file and does not need to resolve source-module downloads.

## Deliberate boundaries

The strategy never enables kiosk mode or hides the HA header/sidebar. Those
settings belong to the dashboard owner and stay separate from strategy output.

No backend integration, persisted credentials, helper creation, auto-discovery,
or service execution during generation. Native cards provide device actions,
availability and state translations. The custom history element reads authenticated
Recorder history over HA WebSocket, groups compatible units/classes, preserves
unknown/unavailable gaps, and bounds chart marker counts. Its refresh timer and
stale requests are cleaned up on disconnect. The custom live card provides
presentation, navigation, entity detail requests, and explicit light/switch
toggles using HA services. Controls are disabled for missing/unavailable entities;
action failures are displayed instead of assuming success. The existing minimal
`entities` configuration remains supported.


## Technical drill-down

`core/admin.js` validates explicit data sources, counts router tracker presence
without inferring WAN or Wi-Fi status, and groups numeric entities by unit and
device class. `modules/system.js` creates one Admin navigation destination plus
Internet, Network and Host subviews. `cards/admin.js` renders current readings
and emits standard entity-detail events. The expert entity list is a further
subview, reachable from Admin. Missing sources render setup guidance; there is
no guessed entity discovery or network scanning.

`core/history.js` handles the compact Recorder response independently of the DOM.
`cards/history.js` owns time ranges, retry, SVG rendering and five-minute refresh.
No backend, chart dependency, external request or credentials are introduced.

Hue room membership is read from each configured group's `entity_id` state
attribute during strategy generation. A configured child light is removed from
the same room's primary controls when its configured group already represents
it. Original member IDs remain in Expert. Room names, grouping, and placement
continue to come from the dashboard configuration; HA area metadata does not
automatically change the floorplan.

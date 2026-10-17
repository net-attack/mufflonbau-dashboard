# Architecture

The source has three layers: validated configuration and pure helpers, view
modules that produce HA configuration, and a small stateful live card for values
that need to change without regenerating the strategy.

| Location | Responsibility |
| --- | --- |
| `src/core/config.js` | Normalize optional fields, validate nested paths, collect referenced IDs |
| `src/core/i18n.js` | English/German strings and profile/config language selection |
| `src/core/state.js` | Pure numeric, availability, warning, and appearance rules |
| `src/core/cards.js` | Small factories for native cards and explicit masonry views |
| `src/modules/home.js` | Home summary, favorites, native weather/calendar/presence, navigation |
| `src/modules/rooms.js` | Room overview/subviews, climate summary and history |
| `src/modules/cleaning.js` | Native vacuum/map cards and explicit input_button actions |
| `src/modules/system.js` | Live warnings, monitored entities, expert inventory |
| `src/cards/live-card.js` | Header clock, room readings, schematic floorplan, warning display |
| `src/strategy.js` | Compose enabled feature views from a single configuration |
| `src/index.js` | Idempotent custom element and HA strategy registration |
| `scripts/build.mjs` | Deterministic single-file HACS output |

## Data flow

The strategy normalizes the configuration, resolves the language, and supplies
`{config, hass, language, text}` to feature modules. Modules return native HA card
configurations. Every generated card and view has an explicit `type`.
No entity IDs, person names, battery limits, or room coordinates are embedded in
source code. Installation data belongs in the strategy configuration.

The strategy runs when HA requests it. It does not poll or call services while
building the dashboard. Native cards receive live states from HA. The custom live
card also receives `hass`; it rerenders when one of its referenced state objects,
the locale, or the theme changes. The header has a 30-second clock timer that is
cleared when disconnected. Entity detail requests use the HA `hass-more-info`
event; floorplan links use HA navigation and preserve normal modified link clicks.
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
   `npm test`. Use the optional browser harness for DOM/navigation changes.

esbuild bundles the standard ES modules into an IIFE, resolving imports and keeping
module scope independent. Its exact development version is pinned in the lockfile.
The check script builds in memory and compares the output with the committed
HACS file, so CI catches source edits without a corresponding bundle update.
HACS receives one file and does not need to resolve source-module downloads.

## Deliberate boundaries

No backend integration, persisted credentials, helper creation, auto-discovery,
or service execution during generation. Native cards provide device actions,
availability, history, and state translations. The custom live card provides only
presentation, navigation, and entity detail requests. The existing minimal
`entities` configuration remains supported.

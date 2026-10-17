# Development plan

The initial modular migration is implemented. See [ARCHITECTURE.md](ARCHITECTURE.md)
for source ownership and [MIGRATION.md](MIGRATION.md) for the feature mapping.

## Implemented

- Backward-compatible favorites and English/German dashboard strings.
- Shared room definitions, live climate readings, configurable schematic floorplan,
  room detail views, device controls, and history cards.
- Presence, weather, calendar, and live clock summary.
- Vacuum controls, camera map, and per-room helper actions.
- Configurable battery/offline warnings and expert entity inventory.
- Configurable ambient/night appearance and optional kiosk pass-through.
- A single HACS bundle built from small source modules; stale-bundle checks,
  generation/state tests, HA-compatible YAML example tests, and Chromium checks
  running locally and on GitHub Actions.

## Before the first release

1. Validate installation and resource updates through HACS in Home Assistant.
2. Test native cards, navigation, real calendar/map data, state availability,
   and existing cleaning helpers on the target installation.
3. Check phone, tablet, and wall-display layouts with the real room configuration.
4. Choose a license, then tag a version and add release notes.

## Possible next extensions

- A visual strategy editor that writes the existing configuration schema.
- Optional room discovery through HA areas, with explicit overrides taking precedence.
- Energy, solar/battery, and heating views for configured sensors.
- Richer configurable floorplan geometry if needed, keeping presentation separate
  from device mapping and availability logic.

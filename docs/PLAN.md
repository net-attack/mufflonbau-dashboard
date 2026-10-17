# Development plan

## Goal and architecture

Mufflonbau is a responsive dashboard within Home Assistant, updated through HACS.
It starts as a JavaScript dashboard strategy using native HA cards and existing
entities, without storing credentials. A backend integration is only needed if
new data sources or custom entities are introduced.

Configuration supports `title`, `entities`, and `language` (`auto`, `en`, or `de`).
Entity IDs are configured explicitly, without assumptions about the installation.
Missing entities appear in a notice. Native cards handle availability and controls.
Dashboard strings are centralized in an English/German translation dictionary.
Automatic language selection follows the HA profile, with English as the fallback.
Code identifiers, comments, errors, and documentation use English.

## Milestones

1. **Foundation:** repository created and uploaded; initial strategy, example
   configuration, translations, and automated generation tests available.
   Validate HACS installation in HA, choose a license, and publish the first release.
2. **Home view:** decide which information and devices to show; configure status,
   favorites, lights, and temperature using real entities.
3. **Rooms:** modular views per room, initially with explicit assignment and later
   optional discovery through HA areas. Manual selection takes precedence.
4. **Energy and climate:** consumption, solar/battery, and heating for existing
   sensors, accounting for units, unavailable states, and history.
5. **Interaction and design:** phones, tablets, wall displays, HA themes,
   accessibility, and an optional visual configuration editor.
6. **Releases:** versioning, changelog, and HACS validation; pursue the default
   catalog after stable real-world use.

Each new module should have its own configuration and a focused responsibility.
As the project grows, split source code into `src/` and build a single bundle at
`dist/mufflonbau-dashboard.js`, updating HACS metadata accordingly.

## First release acceptance criteria

- HACS loads the accessible repository and resource without errors.
- The strategy appears in HA and generates a usable home view.
- Empty configuration, valid entities, and missing entities work.
- English, German, profile-based selection, and fallback behavior work.
- State changes appear in native cards.
- Mobile layout and updates to a new version have been verified.

## Open decisions

- Priority: rooms, energy, security, or a general home overview?
- Available devices, entity IDs, and HA version.
- Main device: phone, tablet, or wall display; preferred visual design.
- License before the first release.

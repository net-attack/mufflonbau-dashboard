# Working on Mufflonbau

This repository ships a Home Assistant dashboard strategy as one HACS JavaScript
resource. Read `README.md` for the configuration schema and editor paste targets.

When building or adapting a personal dashboard from an inventory or HA-MCP, use
[`skills/mufflonbau-dashboard/SKILL.md`](skills/mufflonbau-dashboard/SKILL.md).
The user-facing export/MCP setup instructions and starting prompts are in
[`docs/AGENT-SETUP.de.md`](docs/AGENT-SETUP.de.md).

Personal entity mappings and layouts belong in `examples/*.local.yaml`; exports
and read-back backups belong in `debug/*.local.json`. These paths are ignored.
Keep credentials and secret connection URLs in the client's private settings.
Shared examples and browser fixtures use synthetic entities.

Edit frontend source under `src/` and run `npm run build` to update the committed
`mufflonbau-dashboard.js` bundle. `npm run ci` checks the bundle, YAML examples,
template exports and browser behavior. For export-template changes, run
`npm run test:templates`; for personal YAML, run `node --test test/yaml.test.js`.
The browser gallery under `test-results/views/` uses synthetic data and native
HA card placeholders; it does not prove live device behavior.

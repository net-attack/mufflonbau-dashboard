# Mufflonbau Dashboard

An extensible Home Assistant dashboard packaged as a HACS frontend repository.
The dashboard strategy generates a home view with configurable entities and supports
English and German.

**Status:** the repository is available privately on GitHub. Installation and
validation in a real Home Assistant instance are still pending.

## Installation

Requirements: Home Assistant 2026.5 or newer and HACS.
The repository must be accessible to HACS before installation.

1. Add `https://github.com/net-attack/mufflonbau-dashboard` to HACS as a custom
   repository of type **Dashboard**.
2. Download Mufflonbau Dashboard and check that its JavaScript module resource is
   registered: `/hacsfiles/mufflonbau-dashboard/mufflonbau-dashboard.js`.
3. Reload the browser and create a dashboard using the **Mufflonbau** community
   strategy. Alternatively, create an empty dashboard and replace its raw
   configuration with [examples/dashboard.yaml](examples/dashboard.yaml).
4. Add your entity IDs under `strategy.entities`. Missing IDs are reported in the dashboard.

The strategy generates the views. Make persistent changes through its configuration.
No additional custom cards or Python component are required.

## Languages

By default, dashboard text follows the language of your Home Assistant profile.
German regional variants such as `de-DE` use German; other languages fall back to
English. Change your profile language and reload the dashboard to switch languages.
Native Home Assistant cards use Home Assistant's own translations.

To override the language for this dashboard, set `strategy.language` to `en` or `de`.
Use `auto` (the default) to follow the profile:

```yaml
strategy:
  type: custom:mufflonbau
  title: Mufflonbau
  language: auto
  entities: []
```

Custom titles, entity IDs, and entity names are preserved as configured.
Source identifiers, comments, error messages, and documentation are in English;
German UI text is kept in the translation dictionary.

## Development

Use Node.js 22 or newer. Run `npm run check` and `npm test`.
There are no npm dependencies. `mufflonbau-dashboard.js` serves as both source
code and the HACS download.

See the [development plan](docs/PLAN.md) for architecture, milestones, and open decisions.

## Releases

Repository: [net-attack/mufflonbau-dashboard](https://github.com/net-attack/mufflonbau-dashboard),
default branch: `main`. The repository is currently private.
Suggested topics: `home-assistant`, `hacs`, `dashboard`, `lovelace`.
Choose a license, make the repository accessible for distribution, and validate
installation in Home Assistant before publishing `v0.1.0`.
Start with a custom HACS repository; inclusion in the default HACS catalog is a separate step.

## Technical references

- [HACS dashboard requirements](https://www.hacs.xyz/docs/publish/plugin/)
- [HACS repository metadata](https://www.hacs.xyz/docs/publish/start/)
- [Home Assistant dashboard strategies](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-strategy/)

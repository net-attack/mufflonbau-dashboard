// Generate a private HA package from observed source IDs in the local strategy.
import { readFile, writeFile } from 'node:fs/promises';
import { load, dump, YAML11_SCHEMA } from 'js-yaml';
import { normalizeConfig } from '../src/core/config.js';

const input = process.argv[2] ?? 'examples/mufflonbau-weather.local.yaml';
const output = process.argv[3] ?? 'debug/weather-alerts-package.local.yaml';
if (!/^debug\/[^/]+\.local\.yaml$/.test(output)) throw new Error('Write private package exports to debug/*.local.yaml.');
const parsed = load(await readFile(input, 'utf8'), { schema: YAML11_SCHEMA });
const config = normalizeConfig(parsed.strategy ?? parsed).weather_alerts;
if (!config || config.entity !== 'sensor.mufflonbau_weather_alerts') throw new Error('Configure the sensor created by the weather package.');
const sources = config.sources ?? {};
for (const [kind, domain] of [['nina', 'binary_sensor'], ['dwd', 'sensor']]) {
  if (!Array.isArray(sources[kind]) || sources[kind].some(id => typeof id !== 'string' || !new RegExp(`^${domain}\\.[a-z0-9_]+$`).test(id))) throw new Error(`Set sources.${kind} to discovered ${domain} IDs.`);
}
const ids = [...new Set([...sources.nina, ...sources.dwd])];
if (!ids.length) throw new Error('No observed warning sources configured.');
if (!/^notify\.mobile_app_[a-z0-9_]+$/.test(config.tablet_notify_action)) throw new Error('Set the observed Companion App notify action.');
if (typeof config.tablet_dashboard_url !== 'string' || !config.tablet_dashboard_url.startsWith('/')) throw new Error('Set a local dashboard URL.');
const result = load(await readFile('packages/weather_alerts.yaml', 'utf8'), { schema: YAML11_SCHEMA });
result.automation[0].variables = { nina_entities: sources.nina, dwd_entities: sources.dwd };
result.automation[0].triggers[0] = { trigger: 'state', entity_id: ids };
result.automation[1].actions[0].variables = { tablet_notify_action: config.tablet_notify_action, tablet_dashboard_url: config.tablet_dashboard_url };
await writeFile(output, '# Private package export. Install as /config/packages/weather_alerts.yaml.\n' + dump(result, { lineWidth: 110, noRefs: true }));
console.log(`Wrote ${output} (${ids.length} observed source entities).`);

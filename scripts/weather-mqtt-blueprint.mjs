// Generates standalone HA blueprints from the shared, tested warning macros.
// Run with --check to reject stale generated files. No HA/network writes.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dump, defineScalarTag, Schema, YAML11_SCHEMA } from 'js-yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const transport = 'mufflonbau-weather-mqtt-v1';
class Input { constructor(name) { this.name = name; } }
const input = name => new Input(name);
const schema = new Schema([...YAML11_SCHEMA.tags, defineScalarTag('!input', {
  identify: value => value instanceof Input, resolve: value => new Input(value), represent: item => item.name,
})]);
const textInput = (name, description, defaultValue) => ({ name, description, ...(defaultValue === undefined ? {} : { default: defaultValue }), selector: { text: {} } });
const sourceUrl = path => `https://github.com/net-attack/mufflonbau-dashboard/blob/main/blueprints/${path}`;

export function initialWeatherMqttPayload(stateTopic) {
  if (typeof stateTopic !== 'string' || !stateTopic || /[+#\0]/.test(stateTopic)) throw new Error('A concrete fresh state topic is required.');
  return { transport, state_topic: stateTopic, commit_id: 'initial', updated_at: null, count: 0,
    warnings: [], problems: ['Warnquellen wurden noch nicht ausgewertet'], ledger: {}, popup_token: '', sound_token: '', sound_events: [] };
}

export function weatherMqttDiscoveryPayload({ stateTopic, discoveryTopic, aggregateEntity, birthTopic = 'homeassistant/status' }) {
  const identity = createHash('sha256').update(discoveryTopic).digest('hex');
  return { name: 'Mufflonbau Weather Alerts', unique_id: `mufflonbau_weather_${identity}`,
    default_entity_id: aggregateEntity, state_topic: stateTopic, json_attributes_topic: stateTopic,
    value_template: '{{ value_json.count }}', qos: 1, icon: 'mdi:weather-cloudy-alert',
    device: { identifiers: [`mufflonbau_weather_${identity}`], name: 'Mufflonbau Wetter',
      manufacturer: 'Mufflonbau', model: 'NINA/DWD warning aggregate' } };
}

// Only identifiers/topics are configuration. The collector never guesses source
// entities, maps device attributes differently, or creates synthetic warnings.
const topics = {
  state_topic: textInput('Retained Zustandstopic', 'Eindeutiges MQTT-Topic für Zustand und Warnhistorie; keine Platzhalter + oder #.'),
  discovery_topic: textInput('Discovery-Topic', 'Eigenes Discovery-Topic: <prefix>/sensor/<eindeutige_id>/config. Nicht das Zustandstopic.'),
  birth_topic: textInput('HA-Birth-Topic', 'Das tatsächlich konfigurierte HA-MQTT-Birth-/Will-Topic mit online/offline.', 'homeassistant/status'),
};
const topicGuard = `{{ state_topic | length > 0 and discovery_topic | length > 0 and birth_topic | length > 0
  and state_topic != discovery_topic and state_topic != birth_topic and discovery_topic != birth_topic
  and '+' not in state_topic ~ discovery_topic ~ birth_topic and '#' not in state_topic ~ discovery_topic ~ birth_topic
  and discovery_topic is match('^[^+#]+/sensor/(?:[A-Za-z0-9_-]+/)?[A-Za-z0-9_-]+/config$')
  and aggregate_entity is match('^sensor[.][a-z0-9_]+$') }}`;

const discoveryTemplate = `{% set identity = discovery_topic | sha256 %}
{{ dict(name='Mufflonbau Weather Alerts', unique_id='mufflonbau_weather_' ~ identity,
  default_entity_id=aggregate_entity, state_topic=state_topic, json_attributes_topic=state_topic,
  value_template='{{ value_json.count }}', qos=1, icon='mdi:weather-cloudy-alert',
  device=dict(identifiers=['mufflonbau_weather_' ~ identity], name='Mufflonbau Wetter',
    manufacturer='Mufflonbau', model='NINA/DWD warning aggregate')) | to_json }}`;
const publishDiscovery = { alias: 'MQTT-Sensor registrieren; vorhandene Historie bleibt unverändert', action: 'mqtt.publish',
  data: { topic: '{{ discovery_topic }}', payload: discoveryTemplate, qos: 1, retain: true } };
const restoreGuard = `{{ has_value(aggregate_entity)
  and state_attr(aggregate_entity, 'transport') == '${transport}'
  and state_attr(aggregate_entity, 'state_topic') == state_topic
  and state_attr(aggregate_entity, 'ledger') is mapping
  and state_attr(aggregate_entity, 'commit_id') is string }}`;

export function generateWeatherMqttBlueprints(macros) {
  if (!macros.includes('macro normalize(') || !macros.includes('macro advance(')) throw new Error('Shared warning macros are missing.');
  const body = `${macros.trimEnd()}
{% set stamp = as_timestamp(now()) %}
{% set snapshot = (normalize | as_function)(nina_entities, dwd_entities, details, stamp) %}
{# Read retained history INSIDE the queued action, after restoration and details retrieval. #}
{% set previous = states[aggregate_entity].attributes %}
{% set result = (advance | as_function)(snapshot.warnings, previous.ledger, stamp) %}
{% set commit = now().isoformat() ~ '-' ~ (range(0, 100000) | random) %}
{{ dict(transport='${transport}', state_topic=state_topic,
  commit_id=commit, updated_at=now().isoformat(), count=snapshot.warnings | count,
  warnings=snapshot.warnings,
  problems=snapshot.problems if nina_entities + dwd_entities else ['Keine Warnquellen konfiguriert'],
  ledger=result.ledger,
  popup_token=(result.popup | map(attribute='id') | join('|') ~ ':' ~ commit) if result.popup else previous.get('popup_token', ''),
  sound_token=(result.sound | map(attribute='id') | join('|') ~ ':' ~ commit) if result.sound else previous.get('sound_token', ''),
  sound_events=result.sound) }}
`;
  const collector = {
    blueprint: {
      name: 'Mufflonbau · NINA/DWD mit persistenter MQTT-Warnhistorie',
      description: 'Führt bestehende Warnquellen zusammen. MQTT Discovery und retained JSON ersetzen kein Warnsystem, sondern speichern den Dashboard-Aggregatzustand. Vor der ersten Verwendung Discovery registrieren, das tatsächliche Sensorziel prüfen und einen nachweislich frischen Zustandsspeicher einmalig initialisieren. Fehlende Historie wird niemals automatisch geleert.',
      domain: 'automation', source_url: sourceUrl('automation/mufflonbau/weather_mqtt.yaml'),
      homeassistant: { min_version: '2026.10.1' },
      input: {
        nina_entities: { name: 'NINA-Warnsensoren für den gewünschten Ort', default: [], selector: { entity: { filter: { domain: 'binary_sensor', integration: 'nina' }, multiple: true } } },
        dwd_entities: { name: 'DWD-Warnsensoren für denselben Ort', default: [], selector: { entity: { filter: { domain: 'sensor', integration: 'dwd_weather_warnings' }, multiple: true } } },
        aggregate_entity: { name: 'Tatsächlich angelegter MQTT-Aggregatsensor', description: 'Nach Discovery ermittelte Entity-ID; auch auf ein mögliches _2-Suffix achten.', selector: { entity: { filter: { domain: 'sensor', integration: 'mqtt' } } } },
        ...topics,
        alert_actions: { name: 'Aktionen bei neuer wichtiger akustischer Warnung', description: 'Optional, standardmäßig still. NINA ab Stufe 3, DWD ab Stufe 4. Variablen: sound_events, sound_token, alert_title, alert_message. Keine Schleife; nur nach bestätigtem MQTT-Commit.', default: [], selector: { action: {} } },
      },
    },
    mode: 'queued', max: 50, max_exceeded: 'warning',
    variables: { nina_entities: input('nina_entities'), dwd_entities: input('dwd_entities'), aggregate_entity: input('aggregate_entity'),
      state_topic: input('state_topic'), discovery_topic: input('discovery_topic'), birth_topic: input('birth_topic') },
    triggers: [
      { trigger: 'state', entity_id: input('nina_entities'), id: 'nina_update' },
      { trigger: 'state', entity_id: input('dwd_entities'), id: 'dwd_update' },
      { trigger: 'state', entity_id: input('aggregate_entity'), from: ['unknown', 'unavailable'], to: null, id: 'aggregate_recovery' },
      { trigger: 'homeassistant', event: 'start', id: 'startup' },
      { trigger: 'mqtt', topic: input('birth_topic'), payload: 'online', id: 'mqtt_online' },
    ],
    conditions: [{ condition: 'template', value_template: `{{ trigger is not defined or trigger is none or trigger.id is not defined or trigger.id != 'aggregate_recovery'
      or (trigger.to_state is not none and trigger.to_state.state not in ['unknown', 'unavailable']) }}` }],
    actions: [
      { alias: 'Topic-Kollisionen und ungültige Ziele abweisen', condition: 'template', value_template: topicGuard },
      publishDiscovery,
      { alias: 'Retained Historie wiederherstellen; bei Zeitüberschreitung ohne Veröffentlichung oder Ton stoppen',
        wait_template: restoreGuard, timeout: { seconds: 45 }, continue_on_timeout: false },
      { variables: { details: {}, active_nina: "{{ nina_entities | select('is_state', 'on') | list }}" } },
      { if: '{{ active_nina | count > 0 }}', then: [
        { action: 'nina.get_details', target: { entity_id: '{{ active_nina }}' }, response_variable: 'details', continue_on_error: true },
      ] },
      // Recheck after asynchronous integration I/O. A reconnect can remove the sensor meanwhile.
      { alias: 'Historie nach NINA-Abfrage erneut prüfen', condition: 'template', value_template: restoreGuard },
      { variables: { next_payload: body } },
      { alias: 'Warnungen und Dedup-Historie gemeinsam retained speichern', action: 'mqtt.publish',
        data: { topic: '{{ state_topic }}', payload: '{{ next_payload | to_json }}', qos: 1, retain: true } },
      { alias: 'Exakten Commit abwarten, bevor Ton oder nächste Warteschlangenaktion möglich ist',
        wait_template: `{{ has_value(aggregate_entity)
          and state_attr(aggregate_entity, 'commit_id') == next_payload.commit_id
          and state_attr(aggregate_entity, 'ledger') == next_payload.ledger }}`,
        timeout: { seconds: 30 }, continue_on_timeout: false },
      { variables: { sound_events: '{{ next_payload.sound_events }}', sound_token: '{{ next_payload.sound_token }}',
        alert_title: "{{ (next_payload.sound_events[0].source ~ ' · Warnung') if next_payload.sound_events else '' }}",
        alert_message: "{{ next_payload.sound_events | map(attribute='title') | join(' · ') }}" } },
      { if: '{{ sound_events | count > 0 }}', then: input('alert_actions') },
    ],
  };
  const discovery = {
    blueprint: {
      name: 'Mufflonbau · MQTT-Warnsensor registrieren',
      description: 'Registriert nur Discovery-Konfiguration; verändert niemals den retained Zustand oder die Warnhistorie. Nach Ausführung die tatsächliche angelegte Entity-ID prüfen. Ersteinrichtung eines nachweislich frischen Topics erfolgt ausdrücklich separat.',
      domain: 'script', source_url: sourceUrl('script/mufflonbau/weather_mqtt_discovery.yaml'),
      homeassistant: { min_version: '2026.10.1' },
      input: { aggregate_entity: textInput('Gewünschte erste Sensor-ID', 'Neue ID im Format sensor.<name>. Home Assistant kann bei Kollisionen ein Suffix ergänzen.'), ...topics },
    },
    mode: 'single', variables: { aggregate_entity: input('aggregate_entity'), state_topic: input('state_topic'), discovery_topic: input('discovery_topic'), birth_topic: input('birth_topic') },
    sequence: [{ condition: 'template', value_template: topicGuard }, publishDiscovery],
  };
  const header = `# Generated by node scripts/weather-mqtt-blueprint.mjs; edit the generator or shared macros.\n# Shared macros SHA-256: ${createHash('sha256').update(macros).digest('hex')}\n`;
  const serialize = object => header + dump(object, { schema, noRefs: true, lineWidth: 110 });
  return { 'blueprints/automation/mufflonbau/weather_mqtt.yaml': serialize(collector),
    'blueprints/script/mufflonbau/weather_mqtt_discovery.yaml': serialize(discovery) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const macros = await readFile(resolve(root, 'packages/weather_alerts.jinja'), 'utf8');
  for (const [path, contents] of Object.entries(generateWeatherMqttBlueprints(macros))) {
    const target = resolve(root, path);
    if (process.argv.includes('--check')) {
      if (await readFile(target, 'utf8') !== contents) throw new Error(`${path} is stale; run node scripts/weather-mqtt-blueprint.mjs`);
    } else { await mkdir(dirname(target), { recursive: true }); await writeFile(target, contents); }
  }
}

"""Execute the generated MQTT blueprint's actual Jinja and action ordering.

Synthetic MQTT/HA boundaries model retained restore, delayed commit reflection
and crashes. No alternate implementation of normalization or deduplication.
"""
import ast
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
from types import SimpleNamespace
import unittest

from jinja2 import StrictUndefined
from jinja2.sandbox import SandboxedEnvironment
import yaml

ROOT = Path(__file__).resolve().parents[1]
COLLECTOR_PATH = ROOT / 'blueprints/automation/mufflonbau/weather_mqtt.yaml'
DISCOVERY_PATH = ROOT / 'blueprints/script/mufflonbau/weather_mqtt_discovery.yaml'
START = datetime(2026, 10, 17, tzinfo=timezone.utc)
AGGREGATE = 'sensor.synthetic_weather_alerts'
NINA = 'binary_sensor.synthetic_nina'
DWD = 'sensor.synthetic_dwd'
ADVANCE = 'sensor.synthetic_dwd_advance'
STATE_TOPIC = 'synthetic/mufflonbau/weather/state'
DISCOVERY_TOPIC = 'homeassistant/sensor/synthetic_weather/config'


class Input:
    def __init__(self, name):
        self.name = name


class BlueprintLoader(yaml.SafeLoader):
    pass


BlueprintLoader.add_constructor('!input', lambda loader, node: Input(loader.construct_scalar(node)))
BLUEPRINT = yaml.load(COLLECTOR_PATH.read_text(), Loader=BlueprintLoader)
DISCOVERY = yaml.load(DISCOVERY_PATH.read_text(), Loader=BlueprintLoader)


def timestamp(value, fallback=None):
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).timestamp()
    except (TypeError, ValueError):
        return fallback


def as_function(macro):
    def call(*args):
        result = []
        macro(*args, returns=result.append)
        return result[0]
    return call


class States(dict):
    def __call__(self, entity):
        return self.get(entity, SimpleNamespace(state='unknown')).state


def state(value, **attributes):
    return SimpleNamespace(state=str(value), attributes=attributes)


class Collector:
    def __init__(self, initial, retained=None):
        self.now = START
        self.states = States({NINA: state('off'), DWD: state(0, warning_count=0), ADVANCE: state(0, warning_count=0)})
        self.retained = deepcopy(retained if retained is not None else initial)
        self.restore()
        self.details = {}
        self.inputs = dict(nina_entities=[NINA], dwd_entities=[DWD, ADVANCE], aggregate_entity=AGGREGATE,
                           state_topic=STATE_TOPIC, discovery_topic=DISCOVERY_TOPIC, birth_topic='homeassistant/status',
                           alert_actions=[{'action': 'notify.synthetic_tablet', 'data': {'message': '{{ alert_message }}'}}])
        self.alerts = []
        self.published = []
        self.reflect_commit = True
        self.crash_after_commit = False
        self.after_details = None
        self.stopped_at = None
        self.context = {}
        self.env = SandboxedEnvironment(undefined=StrictUndefined, extensions=['jinja2.ext.do'])
        # SandboxedEnvironment uses safe_range with the same 100000 limit as HA.
        self.env.globals.update(states=self.states, as_timestamp=timestamp, now=lambda: self.now,
                                state_attr=lambda entity, attr: self.states.get(entity, state('unknown')).attributes.get(attr),
                                is_state=lambda entity, value: self.states(entity) == value,
                                has_value=lambda entity: entity in self.states and self.states(entity) not in ['unknown', 'unavailable'])
        self.env.tests['is_state'] = lambda entity, value: self.states(entity) == value
        self.env.tests['match'] = lambda value, pattern: re.match(pattern, value) is not None
        self.env.filters.update(as_function=as_function, sha256=lambda value: hashlib.sha256(value.encode()).hexdigest(), to_json=json.dumps)

    def restore(self):
        self.states[AGGREGATE] = state(self.retained['count'], **deepcopy(self.retained))

    def render(self, template, context=None, parse=True):
        if not isinstance(template, str) or not any(token in template for token in ['{{', '{%', '{#']):
            return template
        result = self.env.from_string(template).render(**(self.context if context is None else context)).strip()
        if parse:
            try:
                return ast.literal_eval(result)
            except (SyntaxError, ValueError):
                pass
        return result

    def expand(self, value):
        if isinstance(value, Input):
            return self.inputs[value.name]
        if isinstance(value, list):
            return [self.expand(item) for item in value]
        if isinstance(value, dict):
            return {key: self.expand(item) for key, item in value.items()}
        return value

    def execute(self, actions):
        for action in actions:
            if 'condition' in action:
                if not self.render(action['value_template']):
                    self.stopped_at = action.get('alias', 'condition')
                    return False
            elif 'wait_template' in action:
                if not self.render(action['wait_template']):
                    self.stopped_at = action['alias']
                    return False
            elif 'variables' in action:
                for key, value in action['variables'].items():
                    self.context[key] = self.render(value)
            elif 'if' in action:
                if self.render(action['if']) and not self.execute(action['then']):
                    return False
            elif action.get('action') == 'nina.get_details':
                self.context['details'] = deepcopy(self.details)
                if self.after_details:
                    self.after_details()
            elif action.get('action') == 'mqtt.publish':
                data = action['data']
                topic = self.render(data['topic'], parse=False)
                payload = json.loads(self.render(data['payload'], parse=False))
                self.published.append((topic, payload, data['qos'], data['retain']))
                if topic == STATE_TOPIC:
                    self.retained = deepcopy(payload)
                    if self.reflect_commit:
                        self.restore()
                    if self.crash_after_commit:
                        self.stopped_at = 'simulated crash after MQTT commit'
                        return False
            elif action.get('action') == 'notify.synthetic_tablet':
                self.alerts.append(self.render(action['data']['message']))
            else:
                raise AssertionError(f'Unhandled generated action: {action}')
        return True

    def run(self, trigger=None, include_trigger=True):
        self.now += timedelta(microseconds=1)
        self.context = self.expand(BLUEPRINT['variables'])
        if include_trigger:
            self.context['trigger'] = trigger if trigger is not None else dict(platform='state', id='nina_update')
        self.stopped_at = None
        if not all(self.render(condition['value_template']) for condition in BLUEPRINT['conditions']):
            return False
        return self.execute(self.expand(BLUEPRINT['actions']))

    def nina(self, severity='Severe', **updates):
        self.states[NINA] = state('on')
        self.details[NINA] = dict(id='stable-synthetic-id', severity=severity, headline='Synthetische Warnung',
                                  affected_areas='Testgebiet', start='2026-10-17T00:00:00Z', expires='2026-10-18T00:00:00Z',
                                  description='<p>Fenster schließen.</p>', recommended_actions='Drinnen bleiben', **updates)

    def dwd(self, level=3, entity=DWD):
        self.states[entity] = state(level, region_id=1234, region_name='Testgebiet', warning_count=1,
                                    warning_1_type=5, warning_1_level=level, warning_1_headline='Synthetischer Sturm',
                                    warning_1_name='Wind', warning_1_start='2026-10-17T00:00:00Z',
                                    warning_1_end='2026-10-18T00:00:00Z', warning_1_description='Sturmwarnung',
                                    warning_1_instruction='Fenster schließen')


class WeatherMqttTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        script = "import {initialWeatherMqttPayload} from './scripts/weather-mqtt-blueprint.mjs'; console.log(JSON.stringify(initialWeatherMqttPayload(process.argv[1])));"
        cls.initial = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script, STATE_TOPIC], cwd=ROOT))

    def collector(self, **kwargs):
        return Collector(self.initial, **kwargs)

    def test_generated_files_are_current_and_embed_the_exact_shared_macros(self):
        subprocess.run(['node', 'scripts/weather-mqtt-blueprint.mjs', '--check'], cwd=ROOT, check=True)
        template = next(action['variables']['next_payload'] for action in BLUEPRINT['actions'] if 'next_payload' in action.get('variables', {}))
        self.assertIn((ROOT / 'packages/weather_alerts.jinja').read_text().rstrip(), template)
        self.assertNotIn("{% from ", template)
        self.assertNotIn("{% import ", template)
        self.assertEqual(BLUEPRINT['mode'], 'queued')
        self.assertTrue(BLUEPRINT['blueprint']['source_url'].endswith('/weather_mqtt.yaml'))
        self.assertEqual(BLUEPRINT['blueprint']['homeassistant']['min_version'], '2026.10.1')

    def test_discovery_matches_exported_installer_payload_and_does_not_seed_or_reset_state(self):
        c = self.collector()
        c.context = c.expand(DISCOVERY['variables'])
        self.assertTrue(c.execute(c.expand(DISCOVERY['sequence'])))
        self.assertEqual(len(c.published), 1)
        topic, payload, qos, retain = c.published[0]
        self.assertEqual((topic, qos, retain), (DISCOVERY_TOPIC, 1, True))
        script = "import {weatherMqttDiscoveryPayload} from './scripts/weather-mqtt-blueprint.mjs'; console.log(JSON.stringify(weatherMqttDiscoveryPayload(JSON.parse(process.argv[1]))));"
        expected = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script, json.dumps(dict(stateTopic=STATE_TOPIC, discoveryTopic=DISCOVERY_TOPIC, aggregateEntity=AGGREGATE))], cwd=ROOT))
        self.assertEqual(payload, expected)
        self.assertEqual(payload['state_topic'], payload['json_attributes_topic'])
        self.assertNotIn('expire_after', payload, 'Ledger cannot depend on HA sensor state restoration')
        self.assertNotIn('availability_topic', payload, 'An unretained HA birth can predate sensor creation')
        self.assertEqual(c.render(payload['value_template'], dict(value_json=dict(count=2))), 2)
        self.assertEqual(c.retained, self.initial)

    def test_clear_sources_manual_run_and_empty_actions_stay_silent(self):
        c = self.collector()
        self.assertTrue(c.run(include_trigger=False), 'automation.trigger may have no trigger variable')
        self.assertTrue(c.run(trigger={}))
        self.assertEqual(c.retained['count'], 0)
        self.assertEqual(c.retained['warnings'], [])
        self.assertEqual(c.alerts, [])
        c.inputs['nina_entities'] = []; c.inputs['dwd_entities'] = []
        c.run()
        self.assertEqual(c.retained['problems'], ['Keine Warnquellen konfiguriert'])
        c.inputs['nina_entities'] = [NINA]; c.inputs['alert_actions'] = []
        c.nina(); self.assertTrue(c.run())
        self.assertEqual(len(c.retained['sound_events']), 1)
        self.assertEqual(c.alerts, [])

    def test_nina_severity_escalation_repetition_and_attribute_changes(self):
        c = self.collector()
        for severity in ['Minor', 'Moderate']:
            c.nina(severity); c.run(); self.assertEqual(c.alerts, [])
        c.nina('Severe'); c.run()
        self.assertEqual(len(c.alerts), 1)
        token = c.retained['sound_token']; popup = c.retained['popup_token']
        for severity in ['Severe', 'Minor', 'Moderate', 'Severe']:
            c.nina(severity); c.details[NINA]['description'] = 'Nur Text wurde geändert'; c.run()
            self.assertEqual(len(c.alerts), 1)
            self.assertEqual(c.retained['sound_token'], token)
            self.assertEqual(c.retained['popup_token'], popup)
            self.assertEqual(c.retained['sound_events'], [])
        c.nina('Extreme'); c.run()
        self.assertEqual(len(c.alerts), 2)
        self.assertNotEqual(c.retained['sound_token'], token)
        self.assertEqual(c.retained['warnings'][0]['instruction'], 'Drinnen bleiben')

    def test_dwd_three_opens_popup_without_sound_four_sounds_once_across_buckets(self):
        c = self.collector(); c.dwd(3, ADVANCE); c.run()
        self.assertNotEqual(c.retained['popup_token'], '')
        self.assertEqual(c.retained['sound_token'], '')
        c.dwd(4, ADVANCE); c.run(); self.assertEqual(len(c.alerts), 1)
        token = c.retained['sound_token']
        c.dwd(4); c.states[DWD].attributes['warning_1_headline'] = 'Neue Überschrift'
        c.run(); self.assertEqual(c.retained['count'], 1)
        c.states[ADVANCE] = state(0, warning_count=0)
        for _ in range(5):
            c.run()
        self.assertEqual(len(c.alerts), 1)
        self.assertEqual(c.retained['sound_token'], token)

    def test_duplicate_source_ids_choose_the_highest_actual_level_before_dedup(self):
        for first, second in [(2, 4), (4, 2)]:
            c = self.collector(); c.dwd(first, DWD); c.dwd(second, ADVANCE); c.run()
            self.assertEqual(c.retained['count'], 1)
            self.assertEqual(c.retained['warnings'][0]['level'], 4)
            self.assertEqual(len(c.alerts), 1)
            self.assertEqual(next(iter(c.retained['ledger'].values()))['level'], 4)

    def test_removal_outage_missing_details_and_return_keep_seven_day_history(self):
        c = self.collector(); c.nina(); c.dwd(4); c.run()
        ledger = deepcopy(c.retained['ledger'])
        self.assertEqual(len(c.alerts), 1, 'Both new sound events share one action execution')
        self.assertEqual(len(c.retained['sound_events']), 2)
        c.states[NINA].state = 'off'; c.states[DWD] = state(0, warning_count=0); c.run()
        self.assertEqual(c.retained['warnings'], [])
        self.assertEqual(c.retained['ledger'], ledger)
        c.states[NINA].state = 'unavailable'; c.states[DWD].state = 'unavailable'; c.run()
        self.assertEqual(len(c.retained['problems']), 2)
        c.nina(); c.dwd(4); details = c.details; c.details = {}; c.run()
        self.assertTrue(any('Details fehlen' in problem for problem in c.retained['problems']))
        c.details = details; c.run()
        self.assertEqual(len(c.alerts), 1)
        c.now = START + timedelta(days=9)
        c.run()
        self.assertEqual(c.retained['ledger'], {})
        self.assertEqual(c.retained['warnings'], [])

    def test_restart_and_broker_retained_json_do_not_replay_a_previous_sound(self):
        c = self.collector(); c.nina(); c.run()
        self.assertEqual(len(c.alerts), 1)
        restored = self.collector(retained=json.loads(json.dumps(c.retained)))
        restored.nina()
        for trigger in [dict(platform='homeassistant', id='startup'), dict(platform='mqtt', id='mqtt_online')]:
            restored.run(trigger=trigger)
            self.assertEqual(restored.alerts, [])
        restored.nina('Extreme'); restored.run()
        self.assertEqual(len(restored.alerts), 1)

    def test_absent_corrupt_or_wrong_store_never_replaces_history_with_an_empty_ledger(self):
        for corrupt in ['missing', 'unknown', 'unavailable', 'wrong-topic', 'bad-ledger', 'wrong-transport']:
            c = self.collector(); c.nina()
            if corrupt == 'missing':
                del c.states[AGGREGATE]
            elif corrupt in ['unknown', 'unavailable']:
                c.states[AGGREGATE].state = corrupt
            elif corrupt == 'wrong-topic':
                c.states[AGGREGATE].attributes['state_topic'] = 'other/topic'
            elif corrupt == 'bad-ledger':
                c.states[AGGREGATE].attributes['ledger'] = []
            else:
                c.states[AGGREGATE].attributes['transport'] = 'other-transport'
            self.assertFalse(c.run(), corrupt)
            self.assertEqual([topic for topic, *_ in c.published], [DISCOVERY_TOPIC])
            self.assertEqual(c.retained, self.initial)
            self.assertEqual(c.alerts, [])

    def test_commit_must_echo_before_actions_and_an_unconfirmed_commit_cannot_replay_on_restart(self):
        c = self.collector(); c.nina(); c.reflect_commit = False
        self.assertFalse(c.run())
        self.assertIn('Exakten Commit', c.stopped_at)
        self.assertEqual(c.alerts, [])
        c.reflect_commit = True; c.restore(); c.run()
        self.assertEqual(c.alerts, [], 'Persist-before-notify favors no replay if delivery confirmation was lost')
        c.nina('Extreme'); c.run(); self.assertEqual(len(c.alerts), 1)
        self.assertEqual(c.retained['commit_id'], c.states[AGGREGATE].attributes['commit_id'])
        self.assertEqual(c.retained['ledger'], c.states[AGGREGATE].attributes['ledger'])

    def test_crash_after_commit_is_at_most_once_and_queued_runs_read_the_latest_ledger(self):
        c = self.collector(); c.nina(); c.crash_after_commit = True
        c.run(); self.assertEqual(c.alerts, [])
        c.crash_after_commit = False
        for _ in range(8):
            c.run()
        self.assertEqual(c.alerts, [])
        c.nina('Extreme'); c.run()
        for _ in range(8):
            c.run()
        self.assertEqual(len(c.alerts), 1)

    def test_async_details_lookup_rechecks_store_and_never_uses_a_prequeued_ledger_snapshot(self):
        c = self.collector(); c.nina()
        def drop_sensor():
            c.states[AGGREGATE].state = 'unavailable'
        c.after_details = drop_sensor
        self.assertFalse(c.run())
        self.assertEqual([topic for topic, *_ in c.published], [DISCOVERY_TOPIC])
        self.assertEqual(c.alerts, [])
        c.after_details = None; c.restore(); c.run()
        self.assertEqual(len(c.alerts), 1)
        self.assertNotIn('ledger', BLUEPRINT['variables'])
        self.assertNotIn('next_payload', BLUEPRINT['variables'])

    def test_topic_collisions_and_wildcards_fail_before_any_publish(self):
        for overrides in [dict(state_topic=''), dict(state_topic=DISCOVERY_TOPIC), dict(state_topic='homeassistant/status'),
                          dict(state_topic='synthetic/#'), dict(discovery_topic='homeassistant/sensor/+/config'),
                          dict(discovery_topic='invalid/config'), dict(aggregate_entity='light.synthetic')]:
            c = self.collector(); c.inputs.update(overrides)
            self.assertFalse(c.run(), overrides)
            self.assertEqual(c.published, [])

    def test_native_triggers_cover_attributes_startup_birth_and_recovery_without_self_loops(self):
        triggers = BLUEPRINT['triggers']
        self.assertEqual([trigger['trigger'] for trigger in triggers], ['state', 'state', 'state', 'homeassistant', 'mqtt'])
        for trigger, input_name in zip(triggers[:2], ['nina_entities', 'dwd_entities']):
            self.assertEqual(trigger['entity_id'].name, input_name)
            self.assertNotIn('to', trigger, 'Warnings can change only attributes while state stays on/4')
            self.assertNotIn('from', trigger)
        recovery = triggers[2]
        self.assertEqual(recovery['from'], ['unknown', 'unavailable'])
        self.assertIsNone(recovery['to'], 'Only state transitions; aggregate attribute writes cannot self-trigger')
        self.assertEqual(triggers[-1]['topic'].name, 'birth_topic')
        self.assertEqual(triggers[-1]['payload'], 'online')
        c = self.collector()
        self.assertFalse(c.run(trigger=dict(platform='state', id='aggregate_recovery', to_state=state('unavailable'))))
        self.assertTrue(c.run(trigger=dict(platform='state', id='aggregate_recovery', to_state=state(0))))
        for action in BLUEPRINT['actions']:
            if 'wait_template' in action:
                self.assertFalse(action['continue_on_timeout'])
                self.assertGreater(action['timeout']['seconds'], 0)
            if action.get('action') == 'mqtt.publish':
                self.assertEqual(action['data']['qos'], 1)
                self.assertIs(action['data']['retain'], True)
                self.assertNotIn('publish_options', action['data'], 'UI grouping is not part of MQTT_PUBLISH_SCHEMA')

    def test_safe_range_limit_and_unicode_json_round_trip(self):
        c = self.collector()
        with self.assertRaises(OverflowError):
            c.render('{{ range(0, 2147483647) | random }}')
        c.nina(); c.details[NINA]['headline'] = '„Fenster zu“ · Grüße aus dem Testgebiet'
        c.run()
        self.assertEqual(c.retained['warnings'][0]['title'], c.details[NINA]['headline'])
        self.assertEqual(c.retained['warnings'][0]['description'], 'Fenster schließen.')
        self.assertEqual(len(c.alerts), 1)


if __name__ == '__main__':
    unittest.main()

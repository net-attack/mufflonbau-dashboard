"""Exercise paginated exports with simulated Home Assistant template helpers."""
import json
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
import unittest

from jinja2.sandbox import SandboxedEnvironment

STAMP = datetime(2026, 10, 17, tzinfo=timezone.utc)


def state(entity_id, value, attributes=None):
    attributes = attributes or {}
    return SimpleNamespace(entity_id=entity_id, domain=entity_id.split('.')[0],
        name=attributes.get('friendly_name', entity_id), state=value,
        attributes=attributes, last_updated=STAMP)


class DiagnosticTemplateTest(unittest.TestCase):
    def render(self, states, section='lights', offset=0):
        env = SandboxedEnvironment()
        env.filters['to_json'] = lambda value, pretty_print=False: json.dumps(value, indent=2 if pretty_print else None)
        env.globals.update(states=states, area_id=lambda value: 'living', area_name=lambda value: 'Living room',
            device_id=lambda value: None if value == 'light.room' else 'device1',
            device_attr=lambda device, key: {'name': 'Device', 'manufacturer': 'Example', 'model': 'Test'}.get(key),
            now=lambda: STAMP)
        path = Path(__file__).resolve().parents[1] / 'examples/diagnostics-template.jinja'
        template = path.read_text().replace("set section = 'lights'", f"set section = '{section}'").replace('set offset = 0', f'set offset = {offset}')
        rendered = env.from_string(template).render()
        self.assertLess(len(rendered), 262144, 'Must fit the Home Assistant template output limit')
        return json.loads(rendered), rendered

    def test_normalizes_sets_without_recursion_and_keeps_group_and_vacuum_details(self):
        cycle = {}
        cycle['self'] = cycle
        nested_list = []
        nested_list.append(nested_list)
        fixture = [
            state('light.room', 'on', {'entity_id': {'light.panel', 'light.lamp'}}),
            state('light.panel', 'off', {'friendly_name': 'Panel "desk"', 'supported_color_modes': {'rgb', 'brightness'}, 'brightness': 0}),
            state('vacuum.robot', 'unavailable', {'error': {'reasons': {'busy', 'network'}, 'retry': True}, 'error_code': 42}),
            state('sensor.cyclic', 'unknown', {'error': cycle, 'rgb_color': nested_list}),
            state('camera.map', 'idle', {'access_token': 'DO_NOT_EXPORT', 'entity_picture': 'DO_NOT_EXPORT'}),
        ]
        entities = {}
        for section in ['lights', 'vacuum', 'sensors']:
            result, rendered = self.render(fixture, section)
            entities.update({entity['entity_id']: entity for entity in result['entities']})
            self.assertNotIn('DO_NOT_EXPORT', rendered)
            self.assertFalse(result['has_more'])
        self.assertEqual(set(entities['light.room']['attributes']['entity_id']), {'light.panel', 'light.lamp'})
        self.assertEqual(set(entities['light.panel']['attributes']['supported_color_modes']), {'rgb', 'brightness'})
        self.assertEqual(entities['light.panel']['attributes']['brightness'], 0)
        self.assertEqual(entities['light.panel']['name'], 'Panel "desk"')
        self.assertEqual(set(entities['vacuum.robot']['attributes']['error']['reasons']), {'busy', 'network'})
        self.assertIs(entities['vacuum.robot']['attributes']['error']['retry'], True)
        self.assertEqual(entities['vacuum.robot']['state'], 'unavailable')
        self.assertEqual(entities['vacuum.robot']['attributes']['error_code'], 42)
        self.assertIsNone(entities['light.room']['device_id'])
        self.assertEqual(entities['light.panel']['area_name'], 'Living room')
        self.assertEqual(entities['sensor.cyclic']['attributes']['error'], {'self': '[nested value omitted]'})
        self.assertEqual(entities['sensor.cyclic']['attributes']['rgb_color'], ['[nested value omitted]'])

    def test_large_installation_pages_without_skipping_or_duplicating_entities(self):
        fixture = [state(f'light.lamp_{index:04}', 'off') for index in range(135)]
        fixture += [state(f'sensor.value_{index:04}', '0') for index in range(2000)]
        offset, seen = 0, []
        while True:
            page, _ = self.render(fixture, offset=offset)
            self.assertEqual(page['total_matching'], 135)
            seen.extend(entity['entity_id'] for entity in page['entities'])
            if not page['has_more']:
                break
            self.assertGreater(page['next_offset'], offset)
            offset = page['next_offset']
        self.assertEqual(len(seen), 135)
        self.assertEqual(len(set(seen)), 135)

    def test_byte_budget_stops_a_page_before_the_entity_count_limit(self):
        members = ['light.' + str(index) + '_' + 'x' * 390 for index in range(180)]
        fixture = [state(f'light.group_{index}', 'off', {'entity_id': members}) for index in range(8)]
        page, _ = self.render(fixture)
        self.assertGreater(len(page['entities']), 0)
        self.assertLess(len(page['entities']), len(fixture))
        self.assertTrue(page['has_more'])
        self.assertEqual(page['next_offset'], len(page['entities']))


if __name__ == '__main__':
    unittest.main()

"""Exercise the export template with simulated Home Assistant template helpers."""
import json
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
import unittest

from jinja2.sandbox import SandboxedEnvironment


class DiagnosticTemplateTest(unittest.TestCase):
    def test_normalizes_sets_and_nested_attributes_without_losing_members(self):
        stamp = datetime(2026, 10, 17, tzinfo=timezone.utc)
        def state(entity_id, value, attributes):
            return SimpleNamespace(entity_id=entity_id, domain=entity_id.split('.')[0],
                name=attributes.get('friendly_name', entity_id), state=value,
                attributes=attributes, last_updated=stamp)
        cycle = {}
        cycle['self'] = cycle
        nested_list = []
        nested_list.append(nested_list)
        states = [
            state('light.room', 'on', {'entity_id': {'light.panel', 'light.lamp'}}),
            state('light.panel', 'off', {'friendly_name': 'Panel "desk"', 'supported_color_modes': {'rgb', 'brightness'}, 'brightness': 0}),
            state('vacuum.robot', 'unavailable', {'error': {'reasons': {'busy', 'network'}, 'retry': True}, 'error_code': 42}),
            state('sensor.cyclic', 'unknown', {'error': cycle, 'rgb_color': nested_list}),
            state('camera.map', 'idle', {'access_token': 'DO_NOT_EXPORT', 'entity_picture': 'DO_NOT_EXPORT'}),
        ]
        env = SandboxedEnvironment()
        env.filters['to_json'] = lambda value, pretty_print=False: json.dumps(value, indent=2 if pretty_print else None)
        env.filters['from_json'] = json.loads
        env.globals.update(states=states, areas=lambda: ['living'],
            area_id=lambda value: 'living', area_name=lambda value: 'Living room',
            device_id=lambda value: None if value == 'light.room' else 'device1',
            device_attr=lambda device, key: {'name': 'Device', 'manufacturer': 'Example', 'model': 'Test'}.get(key),
            now=lambda: stamp)
        template = Path(__file__).resolve().parents[1] / 'examples/diagnostics-template.jinja'
        rendered = env.from_string(template.read_text()).render()
        result = json.loads(rendered)
        entities = {entity['entity_id']: entity for entity in result['entities']}
        self.assertEqual(set(entities['light.room']['attributes']['entity_id']), {'light.panel', 'light.lamp'})
        self.assertEqual(set(entities['light.panel']['attributes']['supported_color_modes']), {'rgb', 'brightness'})
        self.assertEqual(entities['light.panel']['attributes']['brightness'], 0)
        self.assertEqual(entities['light.panel']['name'], 'Panel "desk"')
        self.assertEqual(set(entities['vacuum.robot']['attributes']['error']['reasons']), {'busy', 'network'})
        self.assertIs(entities['vacuum.robot']['attributes']['error']['retry'], True)
        self.assertEqual(entities['vacuum.robot']['state'], 'unavailable')
        self.assertEqual(entities['vacuum.robot']['attributes']['error_code'], 42)
        self.assertIsNone(entities['light.room']['device_id'])
        self.assertEqual(result['areas'], [{'id': 'living', 'name': 'Living room'}])
        self.assertEqual(entities['sensor.cyclic']['attributes']['error'], {'self': '[nested value omitted]'})
        self.assertEqual(entities['sensor.cyclic']['attributes']['rgb_color'], ['[nested value omitted]'])
        self.assertNotIn('DO_NOT_EXPORT', rendered)


if __name__ == '__main__':
    unittest.main()

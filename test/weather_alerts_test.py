"""Warning normalization and persisted deduplication, using synthetic source states."""
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
import unittest

from jinja2 import StrictUndefined
from jinja2.sandbox import SandboxedEnvironment

STAMP = datetime(2026, 10, 17, tzinfo=timezone.utc).timestamp()


def timestamp(value, fallback):
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


class WeatherAlertsTest(unittest.TestCase):
    def setUp(self):
        self.states = {}
        env = SandboxedEnvironment(undefined=StrictUndefined, extensions=['jinja2.ext.do'])
        env.globals.update(states=self.states, as_timestamp=timestamp,
                           has_value=lambda id: id in self.states and self.states[id].state not in ['unknown', 'unavailable'],
                           is_state=lambda id, value: id in self.states and self.states[id].state == value)
        env.filters['as_function'] = as_function
        source = (Path(__file__).resolve().parents[1] / 'packages/weather_alerts.jinja').read_text()
        self.module = env.from_string(source).module
        self.advance = as_function(self.module.advance)
        self.normalize = as_function(self.module.normalize)

    def warning(self, level=3, source='NINA', identity='NINA:test'):
        return dict(id=identity, source=source, level=level, title='Test', end='2026-10-18T00:00:00Z')

    def test_new_escalated_and_repeated_warnings(self):
        first = self.advance([self.warning(2)], {}, STAMP)
        self.assertEqual(first['sound'], [])
        severe = self.advance([self.warning(3)], first['ledger'], STAMP + 1)
        self.assertEqual(len(severe['sound']), 1)
        self.assertEqual(len(severe['popup']), 1)
        for level in [3, 1, 2, 3]:
            repeat = self.advance([self.warning(level)], severe['ledger'], STAMP + 2)
            self.assertEqual(repeat['sound'], [])
            self.assertEqual(repeat['popup'], [])
        self.assertEqual(len(self.advance([self.warning(4)], severe['ledger'], STAMP + 3)['sound']), 1)

    def test_dwd_level_three_is_silent_and_four_sounds(self):
        severe = self.advance([self.warning(3, 'DWD', 'DWD:test')], {}, STAMP)
        self.assertEqual(len(severe['popup']), 1)
        self.assertEqual(severe['sound'], [])
        critical = self.advance([self.warning(4, 'DWD', 'DWD:test')], severe['ledger'], STAMP + 1)
        self.assertEqual(len(critical['sound']), 1)

    def test_restored_ledger_survives_removal_outage_and_order_changes(self):
        warnings = [self.warning(), self.warning(4, 'DWD', 'DWD:test')]
        original = self.advance(warnings, {}, STAMP)
        cleared = self.advance([], original['ledger'], STAMP + 1)
        restored = self.advance(list(reversed(warnings)), cleared['ledger'], STAMP + 2)
        self.assertEqual(restored['sound'], [])
        self.assertEqual(restored['popup'], [])

    def test_real_nina_response_fields_and_expiry(self):
        self.states['binary_sensor.nina_test'] = SimpleNamespace(state='on', attributes={})
        details = {'binary_sensor.nina_test': dict(id='stable-id', headline='<Test>', severity='Severe',
                   affected_areas='Test area', description='<p>Stay inside</p>', recommended_actions='Close windows',
                   start='2026-10-17T00:00:00Z', expires='2026-10-18T00:00:00Z')}
        snapshot = self.normalize(['binary_sensor.nina_test'], [], details, STAMP)
        self.assertEqual(snapshot['warnings'][0]['id'], 'NINA:stable-id')
        self.assertEqual(snapshot['warnings'][0]['level'], 3)
        self.assertEqual(snapshot['warnings'][0]['description'], 'Stay inside')
        self.assertEqual(snapshot['warnings'][0]['type'], '')  # NINA exposes no category in this version.
        self.assertEqual(self.normalize(['binary_sensor.nina_test'], [], details, STAMP + 90000)['warnings'], [])
        self.assertTrue(self.normalize(['binary_sensor.nina_test'], [], {}, STAMP)['problems'])

    def test_dwd_fields_identity_and_unavailable_are_distinct_from_clear(self):
        attrs = dict(region_id=1234, region_name='Test region', warning_count=1, warning_1_type=5,
                     warning_1_level=4, warning_1_headline='Storm', warning_1_name='Wind',
                     warning_1_start='2026-10-17T00:00:00Z', warning_1_end='2026-10-18T00:00:00Z',
                     warning_1_description='Stay inside', warning_1_instruction='Close windows')
        self.states['sensor.dwd_test'] = SimpleNamespace(state='4', attributes=attrs)
        snapshot = self.normalize([], ['sensor.dwd_test'], {}, STAMP)
        warning = snapshot['warnings'][0]
        self.assertEqual(warning['level'], 4)
        attrs.update(warning_1_headline='Updated headline', last_update='new timestamp')
        self.assertEqual(self.normalize([], ['sensor.dwd_test'], {}, STAMP)['warnings'][0]['id'], warning['id'])
        self.states['sensor.dwd_test'].state = 'unavailable'
        outage = self.normalize([], ['sensor.dwd_test'], {}, STAMP)
        self.assertEqual(outage['warnings'], [])
        self.assertTrue(outage['problems'])


if __name__ == '__main__':
    unittest.main()

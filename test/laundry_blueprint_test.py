"""Execute the shipped blueprint's Jinja state transitions, with synthetic HA states.

No alternate JS algorithm: these tests evaluate the actual YAML decision and
deadline templates so regressions in restart/dedup handling are meaningful.
"""
import math
import pathlib
import unittest
import yaml
from jinja2 import Environment

ROOT = pathlib.Path(__file__).resolve().parents[1]


class BlueprintLoader(yaml.SafeLoader):
    pass


BlueprintLoader.add_constructor('!input', lambda loader, node: loader.construct_scalar(node))
BLUEPRINT = yaml.load((ROOT / 'blueprints/automation/mufflonbau/laundry_status.yaml').read_text(), Loader=BlueprintLoader)


class Cycle:
    def __init__(self):
        self.phase = 'idle'
        self.deadline = 0
        self.now = 100000
        self.alerts = 0
        self.power = 0
        self.plug = 'on'
        self.unit = 'W'

    def update(self, power=None, seconds=0, startup=False):
        self.now += seconds
        if power is not None:
            self.power = power
        env = Environment()
        def is_number(value):
            try:
                return math.isfinite(float(value))
            except (ValueError, TypeError):
                return False
        env.globals.update(states=lambda entity: str(self.power), is_number=is_number,
                           is_state=lambda entity, state: self.plug == state,
                           state_attr=lambda entity, attr: self.unit)
        context = dict(phase=self.phase, power=float(self.power) if is_number(self.power) else None,
                       power_entity='sensor.synthetic', plug_entity='switch.synthetic',
                       start_w=10, finish_w=4, start_seconds=120, finish_seconds=600,
                       deadline=self.deadline, current_time=self.now, restarting=startup)
        next_phase = env.from_string(BLUEPRINT['actions'][1]['variables']['next_phase']).render(**context).strip()
        context['next_phase'] = next_phase
        schedule = BLUEPRINT['actions'][2]
        if env.from_string(schedule['if'][0]).render(**context) == 'True':
            timestamp = schedule['then'][0]['data']['timestamp']
            self.deadline = float(env.from_string(timestamp).render(**context))
        notify = BLUEPRINT['actions'][3]['then'][1]['if'][0]
        if self.phase != next_phase and env.from_string(notify).render(**context) == 'True':
            self.alerts += 1
        self.phase = next_phase
        return self.phase


class LaundryBlueprintTest(unittest.TestCase):
    def test_idle_and_startup_cannot_finish(self):
        c = Cycle()
        self.assertEqual(c.update(0, startup=True), 'idle')
        self.assertEqual(c.update(0, seconds=10000), 'idle')
        self.assertEqual(c.alerts, 0)

    def test_start_debounce_and_pauses_and_single_completion(self):
        c = Cycle()
        self.assertEqual(c.update(200), 'starting')
        self.assertEqual(c.update(0, seconds=30), 'idle')
        self.assertEqual(c.update(200), 'starting')
        self.assertEqual(c.update(200, seconds=120), 'running')
        self.assertEqual(c.update(0), 'finishing')
        self.assertEqual(c.update(200, seconds=599), 'running')
        self.assertEqual(c.update(0), 'finishing')
        self.assertEqual(c.update(0, seconds=600), 'finished')
        self.assertEqual(c.alerts, 1)
        c.update(0, seconds=600)
        c.update(0, startup=True)
        c.update('unavailable')
        c.update(0)
        self.assertEqual(c.alerts, 1)
        c.update(200)
        c.update(200, seconds=120)
        c.update(0)
        c.update(0, seconds=600)
        self.assertEqual(c.alerts, 2)

    def test_unavailable_and_restart_restart_the_finish_window(self):
        c = Cycle()
        c.update(200); c.update(200, seconds=120); c.update(0)
        self.assertEqual(c.update('unavailable', seconds=590), 'running')
        self.assertEqual(c.update(0), 'finishing')
        self.assertEqual(c.update(0, seconds=590, startup=True), 'finishing')
        self.assertEqual(c.update(0, seconds=20), 'finishing')
        self.assertEqual(c.update(0, seconds=580), 'finished')
        self.assertEqual(c.alerts, 1)

    def test_switch_off_bad_unit_nan_never_finish(self):
        for case in ['off', 'unit', 'nan']:
            c = Cycle()
            c.update(200); c.update(200, seconds=120); c.update(0)
            if case == 'off': c.plug = 'off'
            if case == 'unit': c.unit = 'kW'
            if case == 'nan': c.power = 'nan'
            c.update(seconds=600)
            self.assertNotEqual(c.phase, 'finished')
            self.assertEqual(c.alerts, 0)

    def test_finished_latch_survives_anti_crease_pulses_and_candidate_restart(self):
        c = Cycle()
        c.update(200); c.update(200, seconds=120); c.update(0); c.update(0, seconds=600)
        self.assertEqual(c.alerts, 1)
        self.assertEqual(c.update(200), 'starting_after_finished')
        self.assertEqual(c.update(0, seconds=30), 'finished')
        self.assertEqual(c.alerts, 1, 'Candidate reverting to finished must not notify again')
        c.update(200)
        self.assertEqual(c.update('unavailable'), 'finished')
        self.assertEqual(c.alerts, 1)
        c.update(200)
        self.assertEqual(c.update(200, seconds=100, startup=True), 'starting_after_finished')
        self.assertEqual(c.update(200, seconds=30), 'starting_after_finished')
        self.assertEqual(c.update(200, seconds=90), 'running')
        c.update(0); c.update(0, seconds=600)
        self.assertEqual(c.alerts, 2)

    def test_package_references_defined_helpers_and_blueprint(self):
        package = yaml.safe_load((ROOT / 'packages/laundry_status.yaml').read_text())
        for automation in package['automation']:
            blueprint = automation['use_blueprint']
            self.assertEqual(blueprint['path'], 'mufflonbau/laundry_status.yaml')
            for key in ['phase', 'deadline', 'last_finished']:
                domain, entity = blueprint['input'][key].split('.')
                self.assertIn(entity, package[domain])
                self.assertNotIn('initial', package[domain][entity])
        actions = str(BLUEPRINT['actions'])
        self.assertNotIn('switch.turn_', actions)
        self.assertNotIn('delay', actions)


if __name__ == '__main__':
    unittest.main()

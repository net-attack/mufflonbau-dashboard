import test from 'node:test';
import assert from 'node:assert/strict';
import { presenceDays, presenceStats, presenceDuration } from '../src/core/presence.js';

const hour = 3600000;
const time = value => Date.parse(value);
const row = (date, state) => ({ lc: time(date) / 1000, s: state });
test('presence days follow HA timezone and both DST boundaries', () => {
  for (const [date, hours] of [['2026-03-30T10:00:00Z', 23], ['2026-10-26T10:00:00Z', 25]]) {
    const days = presenceDays(time(date), 'Europe/Berlin');
    assert.equal(days.length, 7);
    assert.equal(days.at(-2).end - days.at(-2).start, hours * hour);
    for (let i = 1; i < days.length; i++) assert.equal(days[i - 1].end, days[i].start);
  }
  assert.equal(presenceDays(time('2026-10-17T10:00:00Z'), 'Europe/Berlin').at(-1).start, time('2026-10-16T22:00:00Z'));
});
test('presence counts outings once across named zones and excludes unknown gaps', () => {
  const now = time('2026-10-17T12:00:00Z');
  const rows = [row('2026-10-16T23:00:00Z', 'home'), row('2026-10-17T02:00:00Z', 'not_home'),
    row('2026-10-17T03:00:00Z', 'Work'), row('2026-10-17T04:00:00Z', 'home'),
    row('2026-10-17T06:00:00Z', 'unavailable'), row('2026-10-17T08:00:00Z', 'Work'), row('2026-10-17T10:00:00Z', 'home')];
  const stats = presenceStats(rows, { state: 'home', last_changed: '2026-10-17T10:00:00Z' }, now);
  assert.equal(stats.today.home, 6 * hour);
  assert.equal(stats.today.away, 4 * hour);
  assert.equal(stats.today.unknown, 2 * hour);
  assert.equal(stats.outings, 1, 'Unknown → away is no proven departure from home');
  assert.equal(stats.lastAway, time('2026-10-17T10:00:00Z'));
  assert.equal(stats.since, time('2026-10-17T10:00:00Z'));
});
test('live changes extend history and away streak survives zone changes', () => {
  const now = time('2026-10-17T12:00:00Z');
  const stats = presenceStats([row('2026-10-16T00:00:00Z', 'home'), row('2026-10-17T08:00:00Z', 'not_home'),
    { lc: time('2026-10-17T09:00:00Z') / 1000 }], { state: 'Work', last_changed: '2026-10-17T10:00:00Z' }, now);
  assert.equal(stats.outings, 1);
  assert.equal(stats.since, time('2026-10-17T08:00:00Z'));
  assert.equal(stats.today.home, 8 * hour);
  assert.equal(stats.today.away, 4 * hour);
});
test('missing and invalid history does not fabricate time at home or outings', () => {
  const now = time('2026-10-17T12:00:00Z');
  for (const rows of [undefined, [], [{ lc: now / 1000, s: 'NaN' }], [{ state: 'home', last_changed: 'invalid' }]]) {
    const stats = presenceStats(rows, { state: 'unavailable' }, now);
    assert.equal(stats.outings, null); assert.equal(stats.known, 0); assert.equal(stats.since, null);
    assert.equal(stats.today.home, 0); assert.equal(stats.today.away, 0);
  }
  assert.equal(presenceDuration(null), '—'); assert.equal(presenceDuration(65 * 60000), '1 h 5 min');
});
test('expanded Recorder states, pre-window snapshots and clipping', () => {
  const now = time('2026-10-17T12:00:00Z');
  const stats = presenceStats([{ state: 'home', last_changed: '2026-09-01T00:00:00Z' }], { state: 'home', last_changed: '2026-09-01T00:00:00Z' }, now);
  assert.equal(stats.today.home, 12 * hour); assert.equal(stats.outings, 0);
  assert.equal(stats.known, 6 * 24 * hour + 12 * hour);
  assert.equal(stats.since, time('2026-09-01T00:00:00Z'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCalendar, selectSeedDays } from '../src/contributions.js';
import { createRandom } from '../src/random.js';

test('normalizes GitHub weeks into game coordinates', () => {
  const calendar = normalizeCalendar({
    totalContributions: 8,
    weeks: [
      { contributionDays: [{ date: '2026-01-01', contributionCount: 3, weekday: 4 }] },
      { contributionDays: [{ date: '2026-01-02', contributionCount: 5, weekday: 5 }] }
    ]
  });
  assert.equal(calendar.width, 2);
  assert.deepEqual(calendar.days[1], { x: 1, y: 5, date: '2026-01-02', count: 5 });
});

test('selects the three highest days and resolves ties deterministically from a seed', () => {
  const days = [
    { date: 'a', count: 7 },
    { date: 'b', count: 9 },
    { date: 'c', count: 7 },
    { date: 'd', count: 8 },
    { date: 'e', count: 1 }
  ];
  const first = selectSeedDays(days, 3, createRandom('daily-seed'));
  const second = selectSeedDays(days, 3, createRandom('daily-seed'));
  assert.deepEqual(first, second);
  assert.deepEqual(first.map(({ count }) => count), [9, 8, 7]);
});

test('falls back to zero-contribution days for a new account', () => {
  const days = Array.from({ length: 4 }, (_, x) => ({ x, y: 0, date: String(x), count: 0 }));
  assert.equal(selectSeedDays(days, 3, createRandom('empty')).length, 3);
});

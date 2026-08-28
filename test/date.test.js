import test from 'node:test';
import assert from 'node:assert/strict';
import { hourInTimeZone, previousDayRange } from '../src/date.js';

test('builds the previous calendar day in Asia/Shanghai', () => {
  const range = previousDayRange({ now: new Date('2026-08-28T02:00:00Z'), timeZone: 'Asia/Shanghai' });
  assert.deepEqual(range, {
    label: '2026-08-27',
    timeZone: 'Asia/Shanghai',
    since: '2026-08-26T16:00:00.000Z',
    until: '2026-08-27T15:59:59.999Z'
  });
});

test('supports an explicit date and daylight-saving time zone', () => {
  const range = previousDayRange({ date: '2026-03-08', timeZone: 'America/New_York' });
  assert.equal(range.since, '2026-03-08T05:00:00.000Z');
  assert.equal(range.until, '2026-03-09T03:59:59.999Z');
});

test('returns the local hour for a commit timestamp', () => {
  assert.equal(hourInTimeZone('2026-08-27T16:30:00Z', 'Asia/Shanghai'), 0);
});

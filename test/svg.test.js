import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyStats, renderSvg } from '../src/svg.js';

const activity = {
  nameWithOwner: 'Haruko386/FunPDF', owner: 'Haruko386', name: 'FunPDF', description: 'A <colorful> & helpful reader',
  defaultBranch: 'main', openIssues: 2, openPullRequests: 1,
  languages: [{ name: 'Vue', color: '#41b883', percentage: 0.7 }, { name: 'Go', color: '#00add8', percentage: 0.3 }],
  commits: [
    { committedDate: '2026-08-20T02:30:00Z', additions: 100, deletions: 20 },
    { committedDate: '2026-08-27T02:30:00Z', additions: 12, deletions: 3 }
  ]
};
const labels = Array.from({ length: 15 }, (_, index) => `2026-08-${String(13 + index).padStart(2, '0')}`);
const range = { label: '2026-08-27', timeZone: 'Asia/Shanghai', days: 15, labels };

test('groups commit changes by local day', () => {
  const daily = buildDailyStats(activity.commits, range);
  assert.equal(daily.length, 15);
  assert.deepEqual(daily.at(-1), { date: '2026-08-27', commits: 1, additions: 12, deletions: 3 });
});

test('renders an accessible animated SVG with compact language chips', () => {
  const svg = renderSvg({ activity, range, avatarDataUrl: 'data:image/png;base64,AAAA' });
  assert.match(svg, /Yesterday commits/);
  assert.match(svg, /Code changes by day/);
  assert.match(svg, /Commits by day/);
  assert.match(svg, /1 commits, 12 additions, 3 deletions on 2026-08-27/);
  assert.match(svg, /font-size: 12px/);
  assert.match(svg, /@keyframes grow/);
  assert.match(svg, /A &lt;colorful&gt; &amp; helpful reader/);
  assert.doesNotMatch(svg, /<script/);
});

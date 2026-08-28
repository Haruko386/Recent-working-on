import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHourlyStats, renderSvg } from '../src/svg.js';

const activity = {
  nameWithOwner: 'Haruko386/FunPDF', owner: 'Haruko386', name: 'FunPDF', description: 'A <colorful> & helpful reader',
  defaultBranch: 'main', openIssues: 2, openPullRequests: 1,
  languages: [{ name: 'Vue', color: '#41b883', percentage: 0.7 }, { name: 'Go', color: '#00add8', percentage: 0.3 }],
  commits: [{ committedDate: '2026-08-27T02:30:00Z', additions: 12, deletions: 3 }]
};
const range = { label: '2026-08-27', timeZone: 'Asia/Shanghai' };

test('groups commit changes by local hour', () => {
  const hourly = buildHourlyStats(activity.commits, range.timeZone);
  assert.deepEqual(hourly[10], { hour: 10, commits: 1, additions: 12, deletions: 3 });
});

test('renders an accessible animated SVG with compact language chips', () => {
  const svg = renderSvg({ activity, range, avatarDataUrl: 'data:image/png;base64,AAAA' });
  assert.match(svg, /Yesterday commits/);
  assert.match(svg, /Code changes by hour/);
  assert.match(svg, /font-size: 12px/);
  assert.match(svg, /@keyframes grow/);
  assert.match(svg, /A &lt;colorful&gt; &amp; helpful reader/);
  assert.doesNotMatch(svg, /<script/);
});

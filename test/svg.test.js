import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSvg } from '../src/svg.js';

test('renders accessible, animated SVG without script', () => {
  const svg = renderSvg({
    calendar: {
      width: 2,
      height: 7,
      totalContributions: 4,
      days: [{ x: 0, y: 0, date: '2026-01-01', count: 4 }]
    },
    username: 'octo<&>',
    selectedDays: [{ x: 0, y: 0, date: '2026-01-01', count: 4 }],
    simulation: { frames: [new Set(['0,0']), new Set()], reason: 'extinct' }
  });
  assert.match(svg, /@keyframes lifegame/);
  assert.match(svg, /prefers-reduced-motion/);
  assert.match(svg, /octo&lt;&amp;&gt;/);
  assert.doesNotMatch(svg, /<script/);
});

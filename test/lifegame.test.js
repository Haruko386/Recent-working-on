import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, nextGeneration, simulate } from '../src/lifegame.js';

test('a horizontal blinker becomes vertical', () => {
  const horizontal = createInitialState([{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }]);
  const next = nextGeneration(horizontal, 5, 5);
  assert.deepEqual([...next].sort(), ['2,1', '2,2', '2,3']);
});

test('three isolated cells become extinct and stop the simulation', () => {
  const initial = createInitialState([{ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 6, y: 6 }]);
  const result = simulate(initial, 7, 7, 60);
  assert.equal(result.reason, 'extinct');
  assert.equal(result.frames.length, 2);
  assert.equal(result.frames.at(-1).size, 0);
});

test('a still life is reset at the configured threshold', () => {
  const block = createInitialState([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }]);
  const result = simulate(block, 4, 4, 5);
  assert.equal(result.reason, 'threshold');
  assert.equal(result.frames.length, 6);
  assert.deepEqual([...result.frames.at(-1)].sort(), [...block].sort());
});

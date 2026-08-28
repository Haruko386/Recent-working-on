export function cellKey(x, y) {
  return `${x},${y}`;
}

export function createInitialState(cells) {
  return new Set(cells.map(({ x, y }) => cellKey(x, y)));
}

export function nextGeneration(state, width, height) {
  const neighbors = new Map();

  for (const key of state) {
    const [x, y] = key.split(',').map(Number);
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        if (offsetX === 0 && offsetY === 0) continue;
        const nextX = x + offsetX;
        const nextY = y + offsetY;
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
        const neighborKey = cellKey(nextX, nextY);
        neighbors.set(neighborKey, (neighbors.get(neighborKey) ?? 0) + 1);
      }
    }
  }

  const result = new Set();
  for (const [key, count] of neighbors) {
    if (count === 3 || (count === 2 && state.has(key))) result.add(key);
  }
  return result;
}

export function simulate(initialState, width, height, maxGenerations) {
  const frames = [new Set(initialState)];
  let current = initialState;

  for (let generation = 1; generation <= maxGenerations; generation += 1) {
    current = nextGeneration(current, width, height);
    frames.push(current);
    if (current.size === 0) return { frames, reason: 'extinct' };
  }

  return { frames, reason: 'threshold' };
}

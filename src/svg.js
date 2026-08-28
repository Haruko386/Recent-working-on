const THEMES = {
  green: { background: '#0d1117', grid: '#161b22', levels: ['#0e4429', '#006d32', '#26a641', '#39d353'], live: '#7ee787', text: '#8b949e' },
  ocean: { background: '#071a2b', grid: '#0b263d', levels: ['#0b3d5c', '#075985', '#0284c7', '#38bdf8'], live: '#bae6fd', text: '#8ecae6' },
  purple: { background: '#17111f', grid: '#21172c', levels: ['#3b1f54', '#5b2a86', '#8b5cf6', '#c084fc'], live: '#e9d5ff', text: '#b8a4c9' }
};

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function contributionColor(count, maximum, palette) {
  if (count === 0 || maximum === 0) return palette.grid;
  const ratio = count / maximum;
  return palette.levels[Math.min(palette.levels.length - 1, Math.ceil(ratio * palette.levels.length) - 1)];
}

export function renderSvg({ calendar, username, selectedDays, simulation, theme = 'green', frameDuration = 0.45 }) {
  const palette = THEMES[theme];
  if (!palette) throw new Error(`Unknown theme "${theme}". Choose one of: ${Object.keys(THEMES).join(', ')}.`);

  const cell = 11;
  const gap = 3;
  const pitch = cell + gap;
  const paddingX = 18;
  const paddingTop = 42;
  const paddingBottom = 18;
  const width = paddingX * 2 + calendar.width * pitch - gap;
  const height = paddingTop + paddingBottom + calendar.height * pitch - gap;
  const maximum = Math.max(0, ...calendar.days.map(({ count }) => count));
  const frames = simulation.frames;
  const cycleSeconds = Math.max(frameDuration, frames.length * frameDuration);
  const visiblePercentage = Math.min(99.9, (frameDuration / cycleSeconds) * 100 * 0.92).toFixed(4);

  const backgroundCells = calendar.days.map((day) => {
    const x = paddingX + day.x * pitch;
    const y = paddingTop + day.y * pitch;
    const title = `${day.date}: ${day.count} contribution${day.count === 1 ? '' : 's'}`;
    return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${contributionColor(day.count, maximum, palette)}"><title>${escapeXml(title)}</title></rect>`;
  }).join('');

  const frameGroups = frames.map((state, index) => {
    const liveCells = [...state].map((key) => {
      const [x, y] = key.split(',').map(Number);
      return `<rect x="${paddingX + x * pitch}" y="${paddingTop + y * pitch}" width="${cell}" height="${cell}" rx="2"/>`;
    }).join('');
    return `<g class="frame frame-${index}" style="animation-delay:${(index * frameDuration).toFixed(3)}s" data-generation="${index}">${liveCells}</g>`;
  }).join('');

  const selectedLabel = selectedDays.map(({ date, count }) => `${date} (${count})`).join(', ');
  const title = `${username}'s contribution Game of Life`;
  const description = `Seeded by ${selectedLabel}. ${frames.length} frames; reset reason: ${simulation.reason}.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(title)}</title>
  <desc id="description">${escapeXml(description)}</desc>
  <style>
    .frame { opacity: 0; fill: ${palette.live}; filter: drop-shadow(0 0 3px ${palette.live}); animation: lifegame ${cycleSeconds.toFixed(3)}s linear infinite; }
    @keyframes lifegame { 0%, ${visiblePercentage}% { opacity: 1; } ${Math.min(100, Number(visiblePercentage) + 0.01).toFixed(4)}%, 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .frame { animation: none; opacity: 0; } .frame-0 { opacity: 1; } }
  </style>
  <rect width="100%" height="100%" rx="8" fill="${palette.background}"/>
  <text x="${paddingX}" y="25" fill="${palette.text}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12">${escapeXml(username)} · ${calendar.totalContributions} contributions · Conway's Game of Life</text>
  <g aria-hidden="true">${backgroundCells}</g>
  <g aria-hidden="true">${frameGroups}</g>
</svg>`;
}

export const availableThemes = Object.keys(THEMES);

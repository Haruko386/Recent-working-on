import { dateInTimeZone } from './date.js';

const THEMES = {
  light: {
    background: '#ffffff', border: '#e5e7eb', foreground: '#111827', muted: '#5b6472', grid: '#d7dde5',
    addition: '#2f8738', deletion: '#cf2e2e', accent: '#2563eb', chip: '#f7f9fc'
  },
  dark: {
    background: '#0d1117', border: '#30363d', foreground: '#f0f6fc', muted: '#8b949e', grid: '#30363d',
    addition: '#3fb950', deletion: '#f85149', accent: '#58a6ff', chip: '#161b22'
  }
};

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function truncate(value, maximum) {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function buildDailyStats(commits, range) {
  const days = range.labels.map((date) => ({ date, commits: 0, additions: 0, deletions: 0 }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const commit of commits) {
    const bucket = byDate.get(dateInTimeZone(commit.committedDate, range.timeZone));
    if (!bucket) continue;
    bucket.commits += 1;
    bucket.additions += commit.additions;
    bucket.deletions += commit.deletions;
  }
  return days;
}

function metric(x, value, label, palette, valueColor = palette.foreground) {
  return `<g text-anchor="middle"><text x="${x}" y="154" class="metric" fill="${valueColor}">${escapeXml(value)}</text><text x="${x}" y="178" class="label" fill="${palette.muted}">${escapeXml(label)}</text></g>`;
}

function chartLabels(daily, x, width, palette) {
  const indexes = [...new Set([0, Math.floor((daily.length - 1) / 2), daily.length - 1])];
  return indexes.map((index) => {
    const position = daily.length === 1 ? x + width / 2 : x + (index + 0.5) * width / daily.length;
    return `<text x="${position.toFixed(2)}" y="400" class="axis" fill="${palette.muted}" text-anchor="middle">${daily[index].date.slice(5)}</text>`;
  }).join('');
}

function changeChart(daily, palette) {
  const x = 54;
  const width = 500;
  const top = 237;
  const zero = 320;
  const bottom = 382;
  const maxAdditions = Math.max(1, ...daily.map(({ additions }) => additions));
  const maxDeletions = Math.max(1, ...daily.map(({ deletions }) => deletions));
  const slot = width / daily.length;
  const barWidth = Math.max(3, slot - 7);
  const bars = daily.map((item, index) => {
    const barX = x + index * slot + 2;
    const additionHeight = item.additions ? Math.max(2, item.additions / maxAdditions * (zero - top - 8)) : 0;
    const deletionHeight = item.deletions ? Math.max(2, item.deletions / maxDeletions * (bottom - zero - 7)) : 0;
    const addition = additionHeight ? `<rect class="bar addition" x="${barX.toFixed(2)}" y="${(zero - additionHeight).toFixed(2)}" width="${barWidth.toFixed(2)}" height="${additionHeight.toFixed(2)}" rx="1"><title>${item.date} · +${item.additions}</title></rect>` : '';
    const deletion = deletionHeight ? `<rect class="bar deletion" x="${barX.toFixed(2)}" y="${zero}" width="${barWidth.toFixed(2)}" height="${deletionHeight.toFixed(2)}" rx="1"><title>${item.date} · -${item.deletions}</title></rect>` : '';
    return addition + deletion;
  }).join('');

  return `<g>
    <text x="${x + width / 2}" y="211" class="chart-title" fill="${palette.foreground}" text-anchor="middle">Code changes by day</text>
    <text x="${x}" y="228" class="chart-note" fill="${palette.muted}">Additions and deletions · latest ${daily.length} complete days</text>
    <line x1="${x}" y1="${zero}" x2="${x + width}" y2="${zero}" stroke="${palette.grid}"/>
    <line x1="${x}" y1="${bottom}" x2="${x + width}" y2="${bottom}" stroke="${palette.foreground}" stroke-width="1.5"/>
    ${chartLabels(daily, x, width, palette)}
    <g>${bars}</g>
  </g>`;
}

function commitChart(daily, palette) {
  const x = 600;
  const width = 346;
  const top = 237;
  const bottom = 382;
  const maximum = Math.max(1, ...daily.map(({ commits }) => commits));
  const slot = width / daily.length;
  const barWidth = Math.max(3, slot - 7);
  const bars = daily.map((item, index) => {
    if (!item.commits) return '';
    const height = Math.max(3, item.commits / maximum * (bottom - top - 7));
    return `<rect class="bar commit" x="${(x + index * slot + 2).toFixed(2)}" y="${(bottom - height).toFixed(2)}" width="${barWidth.toFixed(2)}" height="${height.toFixed(2)}" rx="1"><title>${item.date} · ${item.commits} commit${item.commits === 1 ? '' : 's'}</title></rect>`;
  }).join('');

  return `<g>
    <text x="${x + width / 2}" y="211" class="chart-title" fill="${palette.foreground}" text-anchor="middle">Commits by day</text>
    <text x="${x}" y="228" class="chart-note" fill="${palette.muted}">Commit activity · latest ${daily.length} complete days</text>
    <line x1="${x}" y1="${bottom}" x2="${x + width}" y2="${bottom}" stroke="${palette.foreground}" stroke-width="1.5"/>
    ${chartLabels(daily, x, width, palette)}
    <g>${bars}</g>
  </g>`;
}

function languageSection(languages, palette) {
  const visible = languages.slice(0, 6);
  const total = visible.reduce((sum, language) => sum + language.percentage, 0) || 1;
  let barX = 54;
  const barWidth = 892;
  const segments = visible.map((language) => {
    const width = language.percentage / total * barWidth;
    const segment = `<rect x="${barX.toFixed(2)}" y="423" width="${width.toFixed(2)}" height="7" fill="${escapeXml(language.color)}"/>`;
    barX += width;
    return segment;
  }).join('');

  let chipX = 54;
  const chips = [];
  for (const language of visible) {
    const chipWidth = 29 + Math.min(112, language.name.length * 7.2);
    if (chipX + chipWidth > 946) break;
    chips.push(`<g transform="translate(${chipX.toFixed(1)} 442)"><g class="chip">
      <rect width="${chipWidth.toFixed(1)}" height="25" rx="8" fill="${palette.chip}" stroke="${language.color}" stroke-opacity=".28"/>
      <circle cx="12" cy="12.5" r="4" fill="${language.color}"/>
      <text x="21" y="17" class="language" fill="${palette.foreground}">${escapeXml(language.name)}</text>
    </g></g>`);
    chipX += chipWidth + 8;
  }
  return `<g clip-path="url(#language-bar)">${segments}</g>${chips.join('')}`;
}

export function renderSvg({ activity, range, avatarDataUrl, theme = 'light' }) {
  const palette = THEMES[theme];
  if (!palette) throw new Error(`Unknown theme "${theme}". Choose one of: ${Object.keys(THEMES).join(', ')}.`);
  const daily = buildDailyStats(activity.commits, range);
  const yesterday = daily.at(-1);
  const additions = yesterday.additions;
  const deletions = yesterday.deletions;
  const avatar = avatarDataUrl
    ? `<image href="${avatarDataUrl}" x="45" y="34" width="64" height="64" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-clip)"/>`
    : `<circle cx="77" cy="66" r="32" fill="${palette.grid}"/><text x="77" y="73" text-anchor="middle" font-size="22" fill="${palette.muted}">${escapeXml(activity.owner.slice(0, 1).toUpperCase())}</text>`;
  const emptyMessage = activity.commits.length === 0
    ? `<text x="500" y="307" text-anchor="middle" class="empty" fill="${palette.muted}">No commits in the displayed period</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500" viewBox="0 0 1000 500" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(activity.nameWithOwner)} repository activity for ${range.label}</title>
  <desc id="description">${yesterday.commits} commits, ${additions} additions, ${deletions} deletions on ${range.label}; charts show ${daily.length} days. Generated for ${range.timeZone}.</desc>
  <defs>
    <clipPath id="avatar-clip"><circle cx="77" cy="66" r="32"/></clipPath>
    <clipPath id="language-bar"><rect x="54" y="423" width="892" height="7" rx="3.5"/></clipPath>
  </defs>
  <style>
    text { font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .repo { font-size: 31px; letter-spacing: -.8px; } .description { font-size: 16px; }
    .metric { font-size: 28px; font-weight: 700; } .label { font-size: 12px; }
    .chart-title { font-size: 13px; font-weight: 700; } .chart-note, .axis { font-size: 10px; }
    .language { font-size: 12px; font-weight: 600; } .small-stat { font-size: 11px; } .small-number { font-size: 21px; font-weight: 700; }
    .empty { font-size: 14px; font-weight: 600; } .addition { fill: ${palette.addition}; } .deletion { fill: ${palette.deletion}; transform-origin: center top; } .commit { fill: ${palette.foreground}; }
    .bar { transform-box: fill-box; transform-origin: center bottom; animation: grow .75s cubic-bezier(.2,.8,.2,1) both; } .bar.deletion { transform-origin: center top; } .chip { animation: reveal .5s ease-out .45s both; }
    @keyframes grow { from { transform: scaleY(0); opacity: .2; } to { transform: scaleY(1); opacity: 1; } }
    @keyframes reveal { from { transform: translateY(5px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .bar, .chip { animation: none; } }
  </style>
  <rect x="1" y="1" width="998" height="498" rx="12" fill="${palette.background}" stroke="${palette.border}"/>
  ${avatar}
  <text x="126" y="66" class="repo" fill="${palette.foreground}"><tspan font-weight="400">${escapeXml(activity.owner)}/</tspan><tspan font-weight="750">${escapeXml(activity.name)}</tspan></text>
  <text x="46" y="123" class="description" fill="${palette.foreground}">${escapeXml(truncate(activity.description, 104))}</text>
  <g text-anchor="middle"><text x="862" y="57" class="small-number" fill="${palette.foreground}">${activity.openIssues}</text><text x="862" y="78" class="small-stat" fill="${palette.muted}">◉ Open Issues</text></g>
  <g text-anchor="middle"><text x="948" y="57" class="small-number" fill="${palette.foreground}">${activity.openPullRequests}</text><text x="948" y="78" class="small-stat" fill="${palette.muted}">⑂ Open PRs</text></g>
  ${metric(175, formatNumber(yesterday.commits), 'Yesterday commits', palette)}
  ${metric(378, `+${formatNumber(additions)}`, 'Lines added', palette, palette.addition)}
  ${metric(570, `−${formatNumber(deletions)}`, 'Lines deleted', palette, palette.deletion)}
  ${metric(795, range.label, range.timeZone, palette)}
  ${changeChart(daily, palette)}
  ${commitChart(daily, palette)}
  ${emptyMessage}
  ${languageSection(activity.languages, palette)}
  <text x="946" y="482" text-anchor="end" class="axis" fill="${palette.muted}">default: ${escapeXml(activity.defaultBranch ?? 'none')} · repository activity card</text>
</svg>`;
}

export const availableThemes = Object.keys(THEMES);

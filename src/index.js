import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import process from 'node:process';
import { recentDayRange } from './date.js';
import { fetchImageDataUrl, fetchRepositoryActivity } from './github.js';
import { availableThemes, renderSvg } from './svg.js';

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
    const separator = argument.indexOf('=');
    const key = argument.slice(2, separator === -1 ? undefined : separator);
    const value = separator === -1 ? args[++index] : argument.slice(separator + 1);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    options[key] = value;
  }
  return options;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const repository = args.repository ?? process.env.INPUT_REPOSITORY ?? process.env.GITHUB_REPOSITORY;
  const token = args.token ?? process.env.REPOSITORY_TOKEN ?? process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  const timeZone = args.timezone ?? process.env.INPUT_TIMEZONE ?? 'Asia/Shanghai';
  const date = args.date ?? process.env.INPUT_DATE ?? undefined;
  const days = Number(args.days ?? process.env.INPUT_DAYS ?? 15);
  const theme = args.theme ?? process.env.INPUT_THEME ?? 'light';
  const output = args.output ?? process.env.INPUT_OUTPUT ?? 'dist/repository-card.svg';

  if (!repository) throw new Error('A repository is required. Pass --repository OWNER/REPO or set INPUT_REPOSITORY.');
  if (!token) throw new Error('A GitHub token is required. Set REPOSITORY_TOKEN, GH_TOKEN, or GITHUB_TOKEN.');
  if (!availableThemes.includes(theme)) throw new Error(`theme must be one of: ${availableThemes.join(', ')}.`);

  const range = recentDayRange({ timeZone, date, days });
  console.log(`Fetching ${repository} activity from ${range.since} to ${range.until}...`);
  const activity = await fetchRepositoryActivity({ repository, token, since: range.since, until: range.until });
  const avatarDataUrl = await fetchImageDataUrl(activity.avatarUrl);
  const svg = renderSvg({ activity, range, avatarDataUrl, theme });

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, svg, 'utf8');
  const additions = activity.commits.reduce((sum, commit) => sum + commit.additions, 0);
  const deletions = activity.commits.reduce((sum, commit) => sum + commit.deletions, 0);
  console.log(`Generated ${output}: ${activity.commits.length} commits, +${additions}, -${deletions}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

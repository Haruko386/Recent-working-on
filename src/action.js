import { appendFile } from 'node:fs/promises';
import process from 'node:process';
import { recentDayRange } from './date.js';
import { fetchImageDataUrl, fetchRepositoryActivity } from './github.js';
import { publishSvg } from './publish.js';
import { availableThemes, renderSvg } from './svg.js';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required action value: ${name}.`);
  return value;
}

async function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, 'utf8');
  }
}

async function main() {
  const repository = required('CARD_REPOSITORY');
  const readToken = required('CARD_READ_TOKEN');
  const publishToken = required('CARD_PUBLISH_TOKEN');
  const destinationRepository = required('CARD_DESTINATION_REPOSITORY');
  const timeZone = process.env.CARD_TIMEZONE || 'Asia/Shanghai';
  const days = Number(process.env.CARD_DAYS || 15);
  const theme = process.env.CARD_THEME || 'light';
  const branch = process.env.CARD_OUTPUT_BRANCH || 'output-repository-card';
  const filename = process.env.CARD_OUTPUT_FILE || 'repository-card.svg';
  if (!availableThemes.includes(theme)) throw new Error(`theme must be one of: ${availableThemes.join(', ')}.`);

  const range = recentDayRange({ timeZone, days });
  console.log(`Reading ${repository}: ${range.labels[0]} through ${range.label} (${timeZone}).`);
  const activity = await fetchRepositoryActivity({ repository, token: readToken, since: range.since, until: range.until });
  const avatarDataUrl = await fetchImageDataUrl(activity.avatarUrl);
  const svg = renderSvg({ activity, range, avatarDataUrl, theme });
  const result = await publishSvg({ destinationRepository, branch, filename, content: svg, token: publishToken });
  const imageUrl = `https://raw.githubusercontent.com/${destinationRepository}/${branch}/${filename}`;

  console.log(result.changed ? `Published ${imageUrl}` : `Card is already current: ${imageUrl}`);
  await setOutput('image-url', imageUrl);
  await setOutput('branch', branch);
}

main().catch((error) => {
  console.error(`::error::${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});

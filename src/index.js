import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import process from 'node:process';
import { fetchContributionCalendar, selectSeedDays } from './contributions.js';
import { createInitialState, simulate } from './lifegame.js';
import { createRandom } from './random.js';
import { availableThemes, renderSvg } from './svg.js';

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
    const [rawKey, inlineValue] = argument.slice(2).split('=', 2);
    const value = inlineValue ?? args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${rawKey}`);
    options[rawKey] = value;
  }
  return options;
}

function integerOption(value, fallback, name, minimum, maximum) {
  const result = value === undefined ? fallback : Number.parseInt(value, 10);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return result;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const username = args.username ?? process.env.INPUT_USERNAME ?? process.env.GITHUB_REPOSITORY_OWNER;
  const token = args.token ?? process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  const output = args.output ?? process.env.INPUT_OUTPUT ?? 'dist/lifegame.svg';
  const theme = args.theme ?? process.env.INPUT_THEME ?? 'green';
  const maxGenerations = integerOption(args['max-generations'] ?? process.env.INPUT_MAX_GENERATIONS, 60, 'max-generations', 1, 500);
  const frameMilliseconds = integerOption(args['frame-ms'] ?? process.env.INPUT_FRAME_MS, 450, 'frame-ms', 50, 10000);
  const today = new Date().toISOString().slice(0, 10);
  const seed = args.seed ?? process.env.INPUT_SEED ?? `${username}:${today}`;

  if (!username) throw new Error('A username is required. Pass --username or set INPUT_USERNAME/GITHUB_REPOSITORY_OWNER.');
  if (!token) throw new Error('A GitHub token is required. Pass --token or set GH_TOKEN/GITHUB_TOKEN.');
  if (!availableThemes.includes(theme)) throw new Error(`theme must be one of: ${availableThemes.join(', ')}.`);

  console.log(`Fetching contribution calendar for ${username}...`);
  const calendar = await fetchContributionCalendar(username, token);
  const selectedDays = selectSeedDays(calendar.days, 3, createRandom(seed));
  const initialState = createInitialState(selectedDays);
  const simulation = simulate(initialState, calendar.width, calendar.height, maxGenerations);
  const svg = renderSvg({
    calendar,
    username,
    selectedDays,
    simulation,
    theme,
    frameDuration: frameMilliseconds / 1000
  });

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, svg, 'utf8');

  console.log(`Seed cells: ${selectedDays.map(({ date, count }) => `${date}=${count}`).join(', ')}`);
  console.log(`Generated ${simulation.frames.length} frames (${simulation.reason}) at ${output}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

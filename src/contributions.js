import { shuffle } from './random.js';

const QUERY = `
  query ContributionCalendar($login: String!) {
    user(login: $login) {
      contributionCalendar: contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              weekday
            }
          }
        }
      }
    }
  }
`;

export async function fetchContributionCalendar(username, token, fetchImpl = fetch) {
  const response = await fetchImpl('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'lifegame-profile-readme'
    },
    body: JSON.stringify({ query: QUERY, variables: { login: username } })
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${payload.errors.map(({ message }) => message).join('; ')}`);
  }

  const calendar = payload.data?.user?.contributionCalendar?.contributionCalendar;
  if (!calendar) {
    throw new Error(`GitHub user "${username}" was not found or has no visible contribution calendar.`);
  }

  return normalizeCalendar(calendar);
}

export function normalizeCalendar(calendar) {
  const days = calendar.weeks.flatMap((week, x) =>
    week.contributionDays.map((day) => ({
      x,
      y: day.weekday,
      date: day.date,
      count: day.contributionCount
    }))
  );

  return {
    width: calendar.weeks.length,
    height: 7,
    totalContributions: calendar.totalContributions,
    days
  };
}

export function selectSeedDays(days, amount, random) {
  if (days.length < amount) {
    throw new Error(`The contribution calendar has only ${days.length} days; ${amount} are required.`);
  }

  const positiveDays = days.filter(({ count }) => count > 0);
  const pool = positiveDays.length >= amount ? positiveDays : days;
  const grouped = new Map();

  for (const day of pool) {
    if (!grouped.has(day.count)) grouped.set(day.count, []);
    grouped.get(day.count).push(day);
  }

  return [...grouped.keys()]
    .sort((left, right) => right - left)
    .flatMap((count) => shuffle(grouped.get(count), random))
    .slice(0, amount);
}

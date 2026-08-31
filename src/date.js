const formatterCache = new Map();

function formatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(timeZone, new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }));
  }
  return formatterCache.get(timeZone);
}

function zonedParts(date, timeZone) {
  const result = {};
  for (const part of formatter(timeZone).formatToParts(date)) {
    if (part.type !== 'literal') result[part.type] = Number(part.value);
  }
  return result;
}

function zonedMidnight(parts, timeZone) {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day);
  let instant = target;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const actual = zonedParts(new Date(instant), timeZone);
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    instant -= represented - target;
  }
  return new Date(instant);
}

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('date must use YYYY-MM-DD format.');
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (check.getUTCFullYear() !== parts.year || check.getUTCMonth() + 1 !== parts.month || check.getUTCDate() !== parts.day) {
    throw new Error(`Invalid date: ${value}.`);
  }
  return parts;
}

export function previousDayRange({ now = new Date(), timeZone = 'Asia/Shanghai', date } = {}) {
  try {
    formatter(timeZone).format(now);
  } catch {
    throw new Error(`Invalid IANA time zone: ${timeZone}.`);
  }

  let target;
  if (date) {
    target = parseDate(date);
  } else {
    const today = zonedParts(now, timeZone);
    const yesterday = new Date(Date.UTC(today.year, today.month - 1, today.day) - 86_400_000);
    target = { year: yesterday.getUTCFullYear(), month: yesterday.getUTCMonth() + 1, day: yesterday.getUTCDate() };
  }

  const following = new Date(Date.UTC(target.year, target.month - 1, target.day) + 86_400_000);
  const endParts = { year: following.getUTCFullYear(), month: following.getUTCMonth() + 1, day: following.getUTCDate() };
  const label = `${target.year}-${String(target.month).padStart(2, '0')}-${String(target.day).padStart(2, '0')}`;

  const endExclusive = zonedMidnight(endParts, timeZone);
  return {
    label,
    timeZone,
    since: zonedMidnight(target, timeZone).toISOString(),
    until: new Date(endExclusive.getTime() - 1).toISOString()
  };
}

export function recentDayRange({ now = new Date(), timeZone = 'Asia/Shanghai', date, days = 15 } = {}) {
  if (!Number.isInteger(days) || days < 1 || days > 15) {
    throw new Error('days must be an integer from 1 to 15.');
  }

  const endDay = previousDayRange({ now, timeZone, date });
  const target = parseDate(endDay.label);
  const labels = Array.from({ length: days }, (_, index) => {
    const value = new Date(Date.UTC(target.year, target.month - 1, target.day) - (days - 1 - index) * 86_400_000);
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  });
  const start = parseDate(labels[0]);

  return {
    ...endDay,
    since: zonedMidnight(start, timeZone).toISOString(),
    days,
    labels
  };
}

export function dateInTimeZone(isoDate, timeZone) {
  const parts = zonedParts(new Date(isoDate), timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

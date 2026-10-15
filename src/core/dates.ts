// Calendar days as local 'YYYY-MM-DD' strings, so "today" matches the learner's own clock.

export function today(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

function toUtc(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(day: string, n: number): string {
  return new Date(toUtc(day) + n * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/** The Monday of the day's week. */
export function weekStart(day: string): string {
  const weekday = (new Date(toUtc(day)).getUTCDay() + 6) % 7; // Mon = 0
  return addDays(day, -weekday);
}

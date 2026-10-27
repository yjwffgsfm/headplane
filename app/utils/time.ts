const UNITS: [string, number][] = [
  ["年", 365 * 24 * 60 * 60],
  ["个月", 30 * 24 * 60 * 60],
  ["天", 24 * 60 * 60],
  ["小时", 60 * 60],
  ["分钟", 60],
];

/**
 * Formats the time since a date in its largest unit, e.g. "3 hours ago".
 */
export function formatTimeDelta(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (seconds >= size) {
      return `${Math.floor(seconds / size)} ${unit}前`;
    }
  }

  return "刚刚";
}

/**
 * Formats the time until a date in its largest unit, e.g. "in 4 days".
 */
export function formatTimeUntil(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  for (const [unit, size] of UNITS) {
    if (seconds >= size) {
      return `${Math.floor(seconds / size)} ${unit}后`;
    }
  }

  return "即将";
}

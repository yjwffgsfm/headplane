/**
 * Formats the time delta since a given date into a human-readable string.
 * - Under 1 hour: "X minutes ago"
 * - Under 1 day: "X hours, Y minutes ago"
 * - Under 1 month: "X days, Y hours ago"
 * - Over 1 month: "X months, Y days ago"
 */
export function formatTimeDelta(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);

  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }

  if (hours < 24) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} 小时前`;
    }
    return `${hours} 小时 ${remainingMinutes} 分钟前`;
  }

  if (days < 30) {
    const remainingHours = hours % 24;
    if (remainingHours === 0) {
      return `${days} 天前`;
    }
    return `${days} 天 ${remainingHours} 小时前`;
  }

  const remainingDays = days % 30;
  if (remainingDays === 0) {
    return `${months} 个月前`;
  }
  return `${months} 个月 ${remainingDays} 天前`;
}

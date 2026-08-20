export function formatDashboardMonth(period: string) {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return period;
  return `${match[1]} 年 ${Number(match[2])} 月`;
}

export function formatDashboardDate(timestamp: number | null) {
  if (!timestamp) return "尚未開始";
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric" }).format(new Date(timestamp));
}

export function describeCurrentStreak(days: number) {
  if (days <= 0) return "尚未形成連續紀錄";
  if (days === 1) return "最近一次紀錄";
  return `連續 ${days} 天`;
}

export type MonthlyDigestEvent = {
  id: number;
  occurredAt: number;
  datePrecision: "day" | "month" | "year";
  eventType: "memory" | "learning" | "achievement" | "chapter";
  title: string;
  body: string;
  ageLabel?: string | null;
  place?: string | null;
  shareScope: "private" | "public" | "link";
  isPublic: boolean;
  unlocksAt?: number | null;
  tags: Array<{ name: string }>;
  media?: Array<{ url: string; caption?: string | null }>;
  voiceNotes?: Array<{ transcript: string }>;
};

export type MonthlyDigestMonth = { year: number; month: number };

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getAvailablePrivateMonths(events: MonthlyDigestEvent[]): MonthlyDigestMonth[] {
  const months = new Map<string, MonthlyDigestMonth>();
  events.filter((event) => event.shareScope === "private" && !event.isPublic && event.datePrecision !== "year").forEach((event) => {
    const date = new Date(event.occurredAt);
    const value = { year: date.getFullYear(), month: date.getMonth() + 1 };
    months.set(monthKey(value.year, value.month), value);
  });
  return Array.from(months.values()).sort((left, right) => right.year - left.year || right.month - left.month);
}

export function buildMonthlyDigest(events: MonthlyDigestEvent[], target: MonthlyDigestMonth, now = Date.now()) {
  const records = events
    .filter((event) => event.shareScope === "private" && !event.isPublic && event.datePrecision !== "year")
    .filter((event) => {
      const date = new Date(event.occurredAt);
      return date.getFullYear() === target.year && date.getMonth() + 1 === target.month;
    })
    .sort((left, right) => left.occurredAt - right.occurredAt);
  const lockedCount = records.filter((event) => typeof event.unlocksAt === "number" && event.unlocksAt > now).length;
  const typeCounts = {
    memory: records.filter((event) => event.eventType === "memory").length,
    learning: records.filter((event) => event.eventType === "learning").length,
    achievement: records.filter((event) => event.eventType === "achievement").length,
    chapter: records.filter((event) => event.eventType === "chapter").length,
  };
  const tags = Array.from(new Set(records.flatMap((event) => event.tags.map((tag) => tag.name)))).slice(0, 6);
  const title = `${target.year} 年 ${target.month} 月摘要`;
  const availableCount = records.length - lockedCount;
  return {
    title,
    year: target.year,
    month: target.month,
    count: records.length,
    lockedCount,
    availableCount,
    typeCounts,
    tags,
    events: records,
    lead: records.length ? `本月共整理 ${records.length} 段私人事件，其中 ${availableCount} 段可閱讀${lockedCount ? `，另有 ${lockedCount} 段時空膠囊仍維持遮罩` : ""}。` : "這個月份尚未有可整理的私人事件。",
  };
}

import { and, count, eq, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthEvents, type GrowthDiary } from "../../drizzle/schema";
import { deriveLifePhases } from "../lifePhases";

type DbClient = MySql2Database<Record<string, unknown>>;

type DashboardSourceEvent = {
  occurredAt: number;
  eventType: "memory" | "learning" | "achievement" | "chapter";
  ageLabel: string | null;
  phaseKeywords: string | null;
  shareScope: "private" | "public" | "link";
  isPublic: boolean;
};

type DensityRow = { period: string; count: number | string };

export type GrowthDashboardSnapshot = {
  summary: {
    privateEventCount: number;
    writingDayCount: number;
    recentStreak: number;
    longestStreak: number;
    firstRecordedAt: number | null;
    lastRecordedAt: number | null;
  };
  monthlyDensity: Array<{ month: string; count: number }>;
  phaseDensity: Array<{ key: "childhood" | "education" | "career"; label: string; count: number; yearRange?: string }>;
  keywords: Array<{ label: string; count: number }>;
};

function parsePhaseKeywords(rawKeywords: string | null) {
  if (!rawKeywords) return [];
  try {
    const parsed: unknown = JSON.parse(rawKeywords);
    return Array.isArray(parsed)
      ? parsed
          .filter((keyword): keyword is string => typeof keyword === "string")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function isPrivateEvent(event: DashboardSourceEvent) {
  return event.shareScope === "private" && !event.isPublic;
}

function dayNumber(day: string) {
  return Math.floor(new Date(`${day}T00:00:00.000Z`).getTime() / 86_400_000);
}

export function summarizeWritingStreak(days: string[]) {
  const orderedDays = Array.from(new Set(days)).sort((left, right) => right.localeCompare(left));
  let recentStreak = 0;
  let longestStreak = 0;
  let currentRun = 0;
  let previousDay: number | null = null;

  for (const day of orderedDays) {
    const currentDay = dayNumber(day);
    currentRun = previousDay === null || previousDay - currentDay === 1 ? currentRun + 1 : 1;
    if (recentStreak === 0) recentStreak = currentRun;
    longestStreak = Math.max(longestStreak, currentRun);
    previousDay = currentDay;
  }

  return { recentStreak, longestStreak };
}

export function buildGrowthDashboardSnapshot(
  sourceEvents: DashboardSourceEvent[],
  diary: Pick<GrowthDiary, "birthYear" | "educationStartYear" | "careerStartYear" | "childhoodStartYear" | "childhoodEndYear" | "educationEndYear" | "careerEndYear">,
  monthlyRows: DensityRow[],
  dailyRows: DensityRow[],
): GrowthDashboardSnapshot {
  const privateEvents = sourceEvents.filter(isPrivateEvent);
  const keywordCounts = new Map<string, number>();
  for (const event of privateEvents) {
    for (const keyword of parsePhaseKeywords(event.phaseKeywords)) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + 1);
    }
  }

  const phaseDensity = deriveLifePhases(privateEvents, diary).map((phase) => ({
    key: phase.key,
    label: phase.label,
    count: phase.count,
    yearRange: phase.yearRange,
  }));
  const { recentStreak, longestStreak } = summarizeWritingStreak(dailyRows.map((row) => row.period));
  const occurredAt = privateEvents.map((event) => event.occurredAt).sort((left, right) => left - right);

  return {
    summary: {
      privateEventCount: privateEvents.length,
      writingDayCount: dailyRows.length,
      recentStreak,
      longestStreak,
      firstRecordedAt: occurredAt[0] ?? null,
      lastRecordedAt: occurredAt.at(-1) ?? null,
    },
    monthlyDensity: monthlyRows.map((row) => ({ month: row.period, count: Number(row.count) })),
    phaseDensity,
    keywords: Array.from(keywordCounts, ([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hant"))
      .slice(0, 12),
  };
}

/**
 * Returns aggregates only. Event titles, bodies, media, locations and sharing
 * credentials are intentionally never returned from the dashboard endpoint.
 */
export async function getGrowthDashboardStatsForDiary(db: DbClient, diary: GrowthDiary) {
  const privateWhere = and(
    eq(growthEvents.diaryId, diary.id),
    eq(growthEvents.shareScope, "private"),
    eq(growthEvents.isPublic, false),
  );
  // TiDB strict mode needs a byte-for-byte identical expression in select,
  // group-by and order-by. Keep each date bucket as one complete raw fragment
  // instead of mixing a raw column and a Drizzle SQL template.
  const month = sql.raw("DATE_FORMAT(FROM_UNIXTIME(`growth_events`.`occurredAt` / 1000), '%Y-%m')") as ReturnType<typeof sql<string>>;
  const day = sql.raw("DATE_FORMAT(FROM_UNIXTIME(`growth_events`.`occurredAt` / 1000), '%Y-%m-%d')") as ReturnType<typeof sql<string>>;

  const [events, monthlyRows, dailyRows] = await Promise.all([
    db
      .select({
        occurredAt: growthEvents.occurredAt,
        eventType: growthEvents.eventType,
        ageLabel: growthEvents.ageLabel,
        phaseKeywords: growthEvents.phaseKeywords,
        shareScope: growthEvents.shareScope,
        isPublic: growthEvents.isPublic,
      })
      .from(growthEvents)
      .where(privateWhere),
    db
      .select({ period: month, count: count(growthEvents.id) })
      .from(growthEvents)
      .where(privateWhere)
      .groupBy(month)
      .orderBy(month),
    db
      .select({ period: day, count: count(growthEvents.id) })
      .from(growthEvents)
      .where(privateWhere)
      .groupBy(day)
      .orderBy(day),
  ]);

  return buildGrowthDashboardSnapshot(events, diary, monthlyRows, dailyRows);
}

import { and, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthDiaryRecallPreferences, growthEvents } from "../../drizzle/schema";

type DbClient = MySql2Database<Record<string, unknown>>;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RecallCheckRequest = {
  year: number;
  month: number;
  day: number;
  timezoneOffsetMinutes: number;
};

type RecallSourceEvent = {
  occurredAt: number;
  datePrecision: "day" | "month" | "year";
  unlocksAt: number | null;
  shareScope: "private" | "public" | "link";
  isPublic: boolean;
};

export type RecallCheckSummary = {
  onThisDayCount: number;
  futureLetterCount: number;
  status: "checked_empty" | "checked_items";
};

export type RecallPreferencesInput = {
  enabled: boolean;
  timezoneOffsetMinutes: number;
};

export const defaultRecallPreferences = (diaryId: number) => ({
  diaryId,
  enabled: false,
  timezoneOffsetMinutes: 0,
  scheduleCronTaskUid: null,
  lastCheckedAt: null,
  lastOnThisDayCount: 0,
  lastFutureLetterCount: 0,
  lastCheckStatus: "never",
});

function getCalendarParts(timestamp: number, timezoneOffsetMinutes: number) {
  const adjusted = new Date(timestamp - timezoneOffsetMinutes * 60_000);
  return { year: adjusted.getUTCFullYear(), month: adjusted.getUTCMonth() + 1, day: adjusted.getUTCDate() };
}

/**
 * Counts only eligibility. It deliberately accepts no title, body, media, tag,
 * place, voice, or location fields so scheduled execution has no private prose
 * to persist or deliver.
 */
export function buildRecallCheckSummary(events: RecallSourceEvent[], request: RecallCheckRequest, now = Date.now()): RecallCheckSummary {
  const privateEvents = events.filter((event) => event.shareScope === "private" && !event.isPublic);
  const onThisDayCount = privateEvents.filter((event) => {
    if (event.datePrecision !== "day") return false;
    const occurredOn = getCalendarParts(event.occurredAt, request.timezoneOffsetMinutes);
    return request.year > occurredOn.year && request.month === occurredOn.month && request.day === occurredOn.day;
  }).length;
  const futureLetterCount = privateEvents.filter((event) => {
    if (typeof event.unlocksAt !== "number") return false;
    const unlocksOn = getCalendarParts(event.unlocksAt, request.timezoneOffsetMinutes);
    return request.year === unlocksOn.year && request.month === unlocksOn.month && request.day === unlocksOn.day && event.unlocksAt <= now + DAY_MS;
  }).length;
  const hasItems = onThisDayCount > 0 || futureLetterCount > 0;
  return { onThisDayCount, futureLetterCount, status: hasItems ? "checked_items" : "checked_empty" };
}

export async function getRecallPreferencesForDiary(db: DbClient, diaryId: number) {
  const preference = await db.select().from(growthDiaryRecallPreferences).where(eq(growthDiaryRecallPreferences.diaryId, diaryId)).limit(1);
  return preference[0] ?? defaultRecallPreferences(diaryId);
}

export async function saveRecallPreferencesForDiary(db: DbClient, diaryId: number, input: RecallPreferencesInput) {
  await db.insert(growthDiaryRecallPreferences).values({ diaryId, ...input }).onDuplicateKeyUpdate({
    set: { enabled: input.enabled, timezoneOffsetMinutes: input.timezoneOffsetMinutes },
  });
  return getRecallPreferencesForDiary(db, diaryId);
}

export async function setRecallScheduleTaskForDiary(db: DbClient, diaryId: number, taskUid: string | null) {
  await db.insert(growthDiaryRecallPreferences).values({ diaryId, scheduleCronTaskUid: taskUid }).onDuplicateKeyUpdate({
    set: { scheduleCronTaskUid: taskUid },
  });
  return getRecallPreferencesForDiary(db, diaryId);
}

export async function runRecallCheckForDiary(db: DbClient, diaryId: number, request: RecallCheckRequest, now = Date.now()) {
  const events = await db.select({
    occurredAt: growthEvents.occurredAt,
    datePrecision: growthEvents.datePrecision,
    unlocksAt: growthEvents.unlocksAt,
    shareScope: growthEvents.shareScope,
    isPublic: growthEvents.isPublic,
  }).from(growthEvents).where(and(
    eq(growthEvents.diaryId, diaryId),
    eq(growthEvents.shareScope, "private"),
    eq(growthEvents.isPublic, false),
  ));
  const summary = buildRecallCheckSummary(events, request, now);
  await db.insert(growthDiaryRecallPreferences).values({
    diaryId,
    timezoneOffsetMinutes: request.timezoneOffsetMinutes,
    lastCheckedAt: now,
    lastOnThisDayCount: summary.onThisDayCount,
    lastFutureLetterCount: summary.futureLetterCount,
    lastCheckStatus: summary.status,
  }).onDuplicateKeyUpdate({
    set: {
      timezoneOffsetMinutes: request.timezoneOffsetMinutes,
      lastCheckedAt: now,
      lastOnThisDayCount: summary.onThisDayCount,
      lastFutureLetterCount: summary.futureLetterCount,
      lastCheckStatus: summary.status,
    },
  });
  return summary;
}

export async function getRecallPreferenceByTaskUid(db: DbClient, taskUid: string) {
  const preference = await db.select().from(growthDiaryRecallPreferences).where(and(
    eq(growthDiaryRecallPreferences.scheduleCronTaskUid, taskUid),
    eq(growthDiaryRecallPreferences.enabled, true),
  )).limit(1);
  return preference[0];
}

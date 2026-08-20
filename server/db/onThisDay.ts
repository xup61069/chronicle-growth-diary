import { and, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthEvents } from "../../drizzle/schema";

type DbClient = MySql2Database<Record<string, unknown>>;
export type OnThisDayAccessRole = "owner" | "editor" | "commenter";
export type OnThisDayRequest = { year: number; month: number; day: number; timezoneOffsetMinutes: number };

type OnThisDaySourceEvent = {
  id: number;
  occurredAt: number;
  datePrecision: "day" | "month" | "year";
  eventType: "memory" | "learning" | "achievement" | "chapter";
  title: string;
  unlocksAt: number | null;
  shareScope: "private" | "public" | "link";
  isPublic: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function getCalendarParts(timestamp: number, timezoneOffsetMinutes: number) {
  const adjusted = new Date(timestamp - timezoneOffsetMinutes * 60_000);
  return { year: adjusted.getUTCFullYear(), month: adjusted.getUTCMonth() + 1, day: adjusted.getUTCDate() };
}

/** Produces an intentionally minimal, owner-only projection for the private workspace. */
export function buildOwnerOnThisDayMemories(events: OnThisDaySourceEvent[], accessRole: OnThisDayAccessRole, request: OnThisDayRequest, now = Date.now()) {
  if (accessRole !== "owner") return [];

  return events
    .filter((event) => event.shareScope === "private" && !event.isPublic && event.datePrecision === "day")
    .map((event) => {
      const occurredOn = getCalendarParts(event.occurredAt, request.timezoneOffsetMinutes);
      const yearsAgo = request.year - occurredOn.year;
      const isLocked = typeof event.unlocksAt === "number" && event.unlocksAt > now;
      return { event, occurredOn, yearsAgo, isLocked };
    })
    .filter((memory) => memory.yearsAgo > 0 && memory.occurredOn.month === request.month && memory.occurredOn.day === request.day)
    .sort((left, right) => right.event.occurredAt - left.event.occurredAt)
    .map(({ event, yearsAgo, isLocked }) => ({
      id: event.id,
      occurredAt: event.occurredAt,
      yearsAgo,
      isLocked,
      daysRemaining: isLocked ? Math.ceil((event.unlocksAt! - now) / DAY_MS) : 0,
      title: isLocked ? null : event.title,
      eventType: isLocked ? null : event.eventType,
    }));
}

export async function getOwnerOnThisDayMemoriesForDiary(db: DbClient, diaryId: number, request: OnThisDayRequest, now = Date.now()) {
  const events = await db.select({
    id: growthEvents.id,
    occurredAt: growthEvents.occurredAt,
    datePrecision: growthEvents.datePrecision,
    eventType: growthEvents.eventType,
    title: growthEvents.title,
    unlocksAt: growthEvents.unlocksAt,
    shareScope: growthEvents.shareScope,
    isPublic: growthEvents.isPublic,
  }).from(growthEvents).where(and(
    eq(growthEvents.diaryId, diaryId),
    eq(growthEvents.shareScope, "private"),
    eq(growthEvents.isPublic, false),
    eq(growthEvents.datePrecision, "day"),
  ));
  return buildOwnerOnThisDayMemories(events, "owner", request, now);
}

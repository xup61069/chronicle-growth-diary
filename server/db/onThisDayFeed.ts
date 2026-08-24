import { and, eq, isNull } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { createHash } from "node:crypto";
import { growthEvents, growthOnThisDayFeeds } from "../../drizzle/schema";
import { hashShareToken, isShareExpired, makeShareToken } from "../shareAccess";

type DbClient = MySql2Database<Record<string, unknown>>;
type FeedEvent = {
  id: number;
  occurredAt: number;
  title: string;
  unlocksAt: number | null;
};

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toIcsDate(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function opaqueIcsUid(eventId: number, tokenHash: string) {
  return createHash("sha256")
    .update(`${tokenHash}:${eventId}`)
    .digest("hex")
    .slice(0, 32);
}

/** Generates a recurring feed with no body, media, location, member, or diary metadata. */
export function buildOnThisDayIcs(
  events: FeedEvent[],
  now = Date.now(),
  tokenHash = "chronicle-on-this-day"
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chronicle//On This Day//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Chronicle · 那年今日",
  ];
  for (const event of events.filter(
    event => event.unlocksAt === null || event.unlocksAt <= now
  )) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${opaqueIcsUid(event.id, tokenHash)}@chronicle.invalid`,
      `DTSTART;VALUE=DATE:${toIcsDate(event.occurredAt)}`,
      "RRULE:FREQ=YEARLY",
      `SUMMARY:${escapeIcs(event.title)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR", "");
  return lines.join("\r\n");
}

export async function getOnThisDayFeedStatusForDiary(
  db: DbClient,
  diaryId: number
) {
  const feed = await db
    .select({
      id: growthOnThisDayFeeds.id,
      createdAt: growthOnThisDayFeeds.createdAt,
      expiresAt: growthOnThisDayFeeds.expiresAt,
    })
    .from(growthOnThisDayFeeds)
    .where(
      and(
        eq(growthOnThisDayFeeds.diaryId, diaryId),
        isNull(growthOnThisDayFeeds.revokedAt)
      )
    )
    .limit(1);
  return feed[0] && !isShareExpired(feed[0].expiresAt)
    ? { enabled: true, createdAt: feed[0].createdAt, expiresAt: feed[0].expiresAt }
    : { enabled: false, createdAt: null };
}

/** Rotation revokes all active tokens first. The only plaintext token exists in this return value. */
export async function rotateOnThisDayFeedForDiary(
  db: DbClient,
  diaryId: number,
  expiresAt: number | null | undefined,
  now = Date.now()
) {
  const resolvedExpiresAt = expiresAt === undefined ? now + 90 * 24 * 60 * 60 * 1000 : expiresAt;
  if (resolvedExpiresAt !== null && resolvedExpiresAt <= now)
    throw new Error("訂閱到期時間必須在目前時間之後。 ");
  const token = makeShareToken();
  await db.transaction(async tx => {
    await tx
      .update(growthOnThisDayFeeds)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(growthOnThisDayFeeds.diaryId, diaryId),
          isNull(growthOnThisDayFeeds.revokedAt)
        )
      );
    await tx
      .insert(growthOnThisDayFeeds)
      .values({ diaryId, tokenHash: hashShareToken(token), expiresAt: resolvedExpiresAt });
  });
  return token;
}

export async function revokeOnThisDayFeedForDiary(
  db: DbClient,
  diaryId: number
) {
  await db
    .update(growthOnThisDayFeeds)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(growthOnThisDayFeeds.diaryId, diaryId),
        isNull(growthOnThisDayFeeds.revokedAt)
      )
    );
  return { revoked: true };
}

/** Token lookup returns only the columns required to build a recurring all-day ICS event. */
export async function getOnThisDayIcsByToken(
  db: DbClient,
  token: string,
  now = Date.now()
) {
  const feed = await db
    .select({ diaryId: growthOnThisDayFeeds.diaryId, tokenHash: growthOnThisDayFeeds.tokenHash, expiresAt: growthOnThisDayFeeds.expiresAt })
    .from(growthOnThisDayFeeds)
    .where(
      and(
        eq(growthOnThisDayFeeds.tokenHash, hashShareToken(token)),
        isNull(growthOnThisDayFeeds.revokedAt)
      )
    )
    .limit(1);
  if (!feed[0] || isShareExpired(feed[0].expiresAt, now)) return null;
  const events = await db
    .select({
      id: growthEvents.id,
      occurredAt: growthEvents.occurredAt,
      title: growthEvents.title,
      unlocksAt: growthEvents.unlocksAt,
    })
    .from(growthEvents)
    .where(
      and(
        eq(growthEvents.diaryId, feed[0].diaryId),
        eq(growthEvents.shareScope, "private"),
        eq(growthEvents.isPublic, false),
        eq(growthEvents.datePrecision, "day")
      )
    );
  return buildOnThisDayIcs(events, now, feed[0].tokenHash);
}

import { and, asc, eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthEventMedia, growthEvents, growthEventTags, growthTags } from "../../drizzle/schema";

export async function getEnrichedDiaryEvents(db: MySql2Database<Record<string, unknown>>, diaryId: number, isPublicOnly = false) {
  const where = isPublicOnly
    ? and(eq(growthEvents.diaryId, diaryId), eq(growthEvents.isPublic, true))
    : eq(growthEvents.diaryId, diaryId);
  const events = await db.select().from(growthEvents).where(where).orderBy(asc(growthEvents.timelinePosition), asc(growthEvents.occurredAt), asc(growthEvents.id));
  const eventIds = events.map((event) => event.id);
  const taggedRows = eventIds.length
    ? await db.select({ eventId: growthEventTags.eventId, id: growthTags.id, name: growthTags.name, color: growthTags.color })
      .from(growthEventTags).innerJoin(growthTags, eq(growthEventTags.tagId, growthTags.id)).where(inArray(growthEventTags.eventId, eventIds))
    : [];
  const mediaRows = eventIds.length
    ? await db.select().from(growthEventMedia).where(inArray(growthEventMedia.eventId, eventIds)).orderBy(asc(growthEventMedia.sortOrder), asc(growthEventMedia.id))
    : [];
  return events.map((event) => ({
    ...event,
    tags: taggedRows.filter((tag) => tag.eventId === event.id).map(({ eventId: _eventId, ...tag }) => tag),
    media: mediaRows.filter((media) => media.eventId === event.id),
  }));
}

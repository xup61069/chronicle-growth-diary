import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthEventMedia, growthEvents, growthEventTags, growthEventVoiceNotes, growthTags } from "../../drizzle/schema";

function parsePhaseKeywords(rawKeywords: string | null) {
  if (!rawKeywords) return [];
  try {
    const parsed: unknown = JSON.parse(rawKeywords);
    return Array.isArray(parsed)
      ? parsed.filter((keyword): keyword is string => typeof keyword === "string").map((keyword) => keyword.trim()).filter(Boolean).slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

export async function getEnrichedDiaryEvents(db: MySql2Database<Record<string, unknown>>, diaryId: number, scope: "all" | "public" | "link" = "all") {
  const where = scope === "public"
    ? and(eq(growthEvents.diaryId, diaryId), or(eq(growthEvents.shareScope, "public"), eq(growthEvents.isPublic, true)))
    : scope === "link"
      ? and(eq(growthEvents.diaryId, diaryId), or(eq(growthEvents.shareScope, "public"), eq(growthEvents.shareScope, "link"), eq(growthEvents.isPublic, true)))
      : eq(growthEvents.diaryId, diaryId);
  const events = await db.select().from(growthEvents).where(where).orderBy(asc(growthEvents.timelinePosition), asc(growthEvents.occurredAt), asc(growthEvents.id));
  const eventIds = events.map((event) => event.id);
  const taggedRows = eventIds.length
    ? await db.select({ eventId: growthEventTags.eventId, id: growthTags.id, name: growthTags.name, color: growthTags.color, kind: growthTags.kind })
      .from(growthEventTags).innerJoin(growthTags, eq(growthEventTags.tagId, growthTags.id)).where(inArray(growthEventTags.eventId, eventIds))
    : [];
  const mediaRows = eventIds.length
    ? await db.select().from(growthEventMedia).where(inArray(growthEventMedia.eventId, eventIds)).orderBy(asc(growthEventMedia.sortOrder), asc(growthEventMedia.id))
    : [];
  const voiceRows = eventIds.length
    ? await db.select().from(growthEventVoiceNotes).where(inArray(growthEventVoiceNotes.eventId, eventIds)).orderBy(asc(growthEventVoiceNotes.createdAt), asc(growthEventVoiceNotes.id))
    : [];
  return events.map((event) => ({
    ...event,
    phaseKeywords: parsePhaseKeywords(event.phaseKeywords),
    tags: taggedRows.filter((tag) => tag.eventId === event.id && tag.kind === "general").map(({ eventId: _eventId, kind: _kind, ...tag }) => tag),
    skills: taggedRows.filter((tag) => tag.eventId === event.id && tag.kind === "skill").map(({ eventId: _eventId, kind: _kind, ...tag }) => tag),
    media: mediaRows.filter((media) => media.eventId === event.id),
    voiceNotes: voiceRows.filter((voiceNote) => voiceNote.eventId === event.id),
  }));
}

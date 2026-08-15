import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes } from "node:crypto";
import {
  growthDiaries,
  growthEventMedia,
  growthEvents,
  growthEventTags,
  growthTags,
  InsertUser,
  users,
} from "../drizzle/schema";
import { normalizeTagNames, safeMediaName } from "./diaryHelpers";
import { deriveLifePhases } from "./lifePhases";
import { hasShareAccess, hashShareToken } from "./shareAccess";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

let _db: ReturnType<typeof drizzle> | null = null;

export type DiaryEventInput = {
  occurredAt: number;
  datePrecision: "day" | "month" | "year";
  eventType: "memory" | "learning" | "achievement" | "chapter";
  title: string;
  body: string;
  ageLabel?: string | null;
  place?: string | null;
  color: string;
  tagNames: string[];
};

export type DiarySharingInput = {
  shareMode: "private" | "public" | "link";
  birthYear?: number | null;
  educationStartYear?: number | null;
  careerStartYear?: number | null;
  regenerateLink?: boolean;
};

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("資料庫暫時無法連線，請稍後再試。");
  return db;
}

function makeShareSlug(diaryId: number) {
  return `story-${diaryId}-${randomBytes(5).toString("hex")}`;
}

function makeShareToken() {
  return randomBytes(24).toString("base64url");
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function getOrCreateDiary(userId: number) {
  const db = await requireDb();
  const existing = await db.select().from(growthDiaries).where(eq(growthDiaries.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(growthDiaries).values({ userId, title: "我的成長史" });
  const created = await db.select().from(growthDiaries).where(eq(growthDiaries.userId, userId)).orderBy(desc(growthDiaries.id)).limit(1);
  if (!created[0]) throw new Error("無法建立個人成長史。");
  return created[0];
}

async function assertEventOwnership(eventId: number, userId: number) {
  const db = await requireDb();
  const event = await db.select({ id: growthEvents.id, diaryId: growthEvents.diaryId }).from(growthEvents)
    .innerJoin(growthDiaries, eq(growthEvents.diaryId, growthDiaries.id))
    .where(and(eq(growthEvents.id, eventId), eq(growthDiaries.userId, userId))).limit(1);
  if (!event[0]) throw new Error("找不到這筆成長事件，或你沒有編輯權限。");
  return event[0];
}

async function saveEventTags(eventId: number, userId: number, rawTagNames: string[]) {
  const db = await requireDb();
  const tagNames = normalizeTagNames(rawTagNames);
  await db.delete(growthEventTags).where(eq(growthEventTags.eventId, eventId));
  if (tagNames.length === 0) return;
  const tagIds: number[] = [];
  for (const name of tagNames) {
    const existing = await db.select().from(growthTags).where(and(eq(growthTags.userId, userId), eq(growthTags.name, name))).limit(1);
    if (existing[0]) {
      tagIds.push(existing[0].id);
      continue;
    }
    await db.insert(growthTags).values({ userId, name });
    const created = await db.select().from(growthTags).where(and(eq(growthTags.userId, userId), eq(growthTags.name, name))).limit(1);
    if (created[0]) tagIds.push(created[0].id);
  }
  if (tagIds.length) await db.insert(growthEventTags).values(tagIds.map((tagId) => ({ eventId, tagId })));
}

async function getEnrichedDiaryEvents(diaryId: number, isPublicOnly = false) {
  const db = await requireDb();
  const where = isPublicOnly
    ? and(eq(growthEvents.diaryId, diaryId), eq(growthEvents.isPublic, true))
    : eq(growthEvents.diaryId, diaryId);
  const events = await db.select().from(growthEvents).where(where).orderBy(asc(growthEvents.occurredAt), asc(growthEvents.id));
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

function makeLifePhaseSnapshot(diary: typeof growthDiaries.$inferSelect, events: Awaited<ReturnType<typeof getEnrichedDiaryEvents>>) {
  return deriveLifePhases(events, {
    birthYear: diary.birthYear,
    educationStartYear: diary.educationStartYear,
    careerStartYear: diary.careerStartYear,
  });
}

export async function getDiarySnapshot(userId: number) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  const tags = await db.select().from(growthTags).where(eq(growthTags.userId, userId)).orderBy(asc(growthTags.name));
  const events = await getEnrichedDiaryEvents(diary.id);
  return {
    diary,
    tags,
    events,
    lifePhases: makeLifePhaseSnapshot(diary, events),
    sharing: {
      mode: diary.shareMode,
      slug: diary.shareSlug,
      hasPrivateLink: Boolean(diary.shareTokenHash),
    },
  };
}

export async function createDiaryEvent(userId: number, input: DiaryEventInput) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  await db.insert(growthEvents).values({ diaryId: diary.id, occurredAt: input.occurredAt, datePrecision: input.datePrecision, eventType: input.eventType, title: input.title.trim(), body: input.body.trim(), ageLabel: input.ageLabel?.trim() || null, place: input.place?.trim() || null, color: input.color });
  const created = await db.select().from(growthEvents).where(eq(growthEvents.diaryId, diary.id)).orderBy(desc(growthEvents.id)).limit(1);
  if (!created[0]) throw new Error("無法儲存這筆成長事件。");
  await saveEventTags(created[0].id, userId, input.tagNames);
  return { id: created[0].id };
}

export async function updateDiaryEvent(userId: number, eventId: number, input: DiaryEventInput) {
  const db = await requireDb();
  await assertEventOwnership(eventId, userId);
  await db.update(growthEvents).set({ occurredAt: input.occurredAt, datePrecision: input.datePrecision, eventType: input.eventType, title: input.title.trim(), body: input.body.trim(), ageLabel: input.ageLabel?.trim() || null, place: input.place?.trim() || null, color: input.color }).where(eq(growthEvents.id, eventId));
  await saveEventTags(eventId, userId, input.tagNames);
  return { id: eventId };
}

export async function deleteDiaryEvent(userId: number, eventId: number) {
  const db = await requireDb();
  await assertEventOwnership(eventId, userId);
  await db.delete(growthEventTags).where(eq(growthEventTags.eventId, eventId));
  await db.delete(growthEventMedia).where(eq(growthEventMedia.eventId, eventId));
  await db.delete(growthEvents).where(eq(growthEvents.id, eventId));
  return { id: eventId };
}

export async function setDiaryEventVisibility(userId: number, eventId: number, isPublic: boolean) {
  const db = await requireDb();
  await assertEventOwnership(eventId, userId);
  await db.update(growthEvents).set({ isPublic }).where(eq(growthEvents.id, eventId));
  return { id: eventId, isPublic };
}

export async function updateDiarySharing(userId: number, input: DiarySharingInput) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  const shareSlug = diary.shareSlug ?? makeShareSlug(diary.id);
  let shareToken: string | undefined;
  let shareTokenHash = diary.shareTokenHash;

  if (input.shareMode === "link" && (!shareTokenHash || input.regenerateLink)) {
    shareToken = makeShareToken();
    shareTokenHash = hashShareToken(shareToken);
  }
  if (input.shareMode !== "link") shareTokenHash = null;

  await db.update(growthDiaries).set({
    shareMode: input.shareMode,
    shareSlug,
    shareTokenHash,
    birthYear: input.birthYear ?? null,
    educationStartYear: input.educationStartYear ?? null,
    careerStartYear: input.careerStartYear ?? null,
  }).where(eq(growthDiaries.id, diary.id));
  return { mode: input.shareMode, slug: shareSlug, shareToken };
}

export async function getSharedDiary(slug: string, token?: string | null) {
  const db = await requireDb();
  const matching = await db.select().from(growthDiaries).where(eq(growthDiaries.shareSlug, slug)).limit(1);
  const diary = matching[0];
  if (!diary || !hasShareAccess({ mode: diary.shareMode, storedTokenHash: diary.shareTokenHash, providedToken: token })) return null;
  const events = await getEnrichedDiaryEvents(diary.id, true);
  return {
    diary: { title: diary.title, subtitle: diary.subtitle, shareMode: diary.shareMode },
    events,
    lifePhases: makeLifePhaseSnapshot(diary, events),
  };
}

export async function uploadDiaryEventImage(input: { userId: number; eventId: number; fileName: string; mimeType: string; base64: string; caption?: string; }) {
  const db = await requireDb();
  await assertEventOwnership(input.eventId, input.userId);
  const bytes = Buffer.from(input.base64, "base64");
  if (bytes.byteLength > 4 * 1024 * 1024) throw new Error("圖片檔案不可超過 4MB。");
  const fileName = safeMediaName(input.fileName);
  const stored = await storagePut(`growth-diary/${input.userId}/event-${input.eventId}/${fileName}`, bytes, input.mimeType);
  const existingMedia = await db.select({ count: growthEventMedia.id }).from(growthEventMedia).where(eq(growthEventMedia.eventId, input.eventId));
  await db.insert(growthEventMedia).values({ eventId: input.eventId, storageKey: stored.key, url: stored.url, fileName, mimeType: input.mimeType, caption: input.caption?.trim() || null, sortOrder: existingMedia.length });
  return stored;
}

export async function deleteDiaryEventMedia(userId: number, mediaId: number) {
  const db = await requireDb();
  const media = await db.select({ id: growthEventMedia.id }).from(growthEventMedia).innerJoin(growthEvents, eq(growthEventMedia.eventId, growthEvents.id)).innerJoin(growthDiaries, eq(growthEvents.diaryId, growthDiaries.id)).where(and(eq(growthEventMedia.id, mediaId), eq(growthDiaries.userId, userId))).limit(1);
  if (!media[0]) throw new Error("找不到這張圖片，或你沒有刪除權限。");
  await db.delete(growthEventMedia).where(eq(growthEventMedia.id, mediaId));
  return { id: mediaId };
}

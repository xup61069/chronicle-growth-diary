import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  growthDiaries,
  growthDiaryMembers,
  growthEventMedia,
  growthEventRevisions,
  growthEvents,
  growthEventTags,
  growthPhaseReflections,
  growthShareAccessLogs,
  growthTags,
} from "../drizzle/schema";
import { normalizeTagNames, safeMediaName } from "./diaryHelpers";
import { getEnrichedDiaryEvents } from "./db/diaryRead";
import { deriveLifePhases, getInvalidLifePhaseBoundary } from "./lifePhases";
import { parseDiaryEventRevisionSnapshot } from "./db/revisions";
import {
  acceptDiaryInviteForUser,
  createDiaryInviteForDiary,
  createEventCommentForUser,
  getDiaryAuditLogsForDiary,
  getDiaryMembersForDiary,
  getEventCommentsForUser,
  removeDiaryMemberForDiary,
  updateDiaryMemberRoleForDiary,
} from "./db/familyCollaboration";
export type { DiaryMemberRole } from "./db/familyCollaboration";
import type { DiaryMemberRole } from "./db/familyCollaboration";
import { persistDiarySharing, readSharedDiary } from "./db/sharing";
export type { DiarySharingInput } from "./db/sharing";
import type { DiarySharingInput } from "./db/sharing";
import {
  deleteAnnualReflectionForDiary,
  deletePhaseReflectionForDiary,
  generateAnnualReflectionForDiary,
  generatePhaseReflectionForDiary,
  setDiaryAiEnabled,
  updatePhaseReflectionForDiary,
} from "./db/aiReflections";
export { assertAiEnabled } from "./db/aiReflections";
import type { PhaseReflectionInput, ReflectionPhaseKey } from "./db/aiReflections";
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


export type DiaryPhaseBoundariesInput = Pick<DiarySharingInput, "childhoodStartYear" | "childhoodEndYear" | "educationStartYear" | "educationEndYear" | "careerStartYear" | "careerEndYear">;

export type DiaryProfileInput = {
  title: string;
  subtitle?: string | null;
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

export { createLocalUser, deleteAccount, getUserByEmail, getUserByOpenId, upsertUser } from "./db/account";

async function getOrCreateDiary(userId: number) {
  const db = await requireDb();
  const existing = await db.select().from(growthDiaries).where(eq(growthDiaries.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(growthDiaries).values({ userId, title: "我的成長史" });
  const created = await db.select().from(growthDiaries).where(eq(growthDiaries.userId, userId)).orderBy(desc(growthDiaries.id)).limit(1);
  if (!created[0]) throw new Error("無法建立個人成長史。");
  return created[0];
}

type DiaryAccessRole = "owner" | DiaryMemberRole;

async function getDiaryAccessForUser(userId: number, requestedDiaryId?: number) {
  const db = await requireDb();
  const owned = await db.select().from(growthDiaries).where(requestedDiaryId ? and(eq(growthDiaries.userId, userId), eq(growthDiaries.id, requestedDiaryId)) : eq(growthDiaries.userId, userId)).limit(1);
  if (owned[0]) return { diary: owned[0], role: "owner" as const };
  const membership = await db.select({ diary: growthDiaries, role: growthDiaryMembers.role })
    .from(growthDiaryMembers)
    .innerJoin(growthDiaries, eq(growthDiaryMembers.diaryId, growthDiaries.id))
    .where(requestedDiaryId ? and(eq(growthDiaryMembers.userId, userId), eq(growthDiaryMembers.diaryId, requestedDiaryId)) : eq(growthDiaryMembers.userId, userId))
    .limit(1);
  return membership[0] ? { diary: membership[0].diary, role: membership[0].role as DiaryMemberRole } : undefined;
}

async function getWritableDiary(userId: number, requestedDiaryId?: number) {
  const access = await getDiaryAccessForUser(userId, requestedDiaryId);
  if (access?.role === "owner" || access?.role === "editor") return access;
  if (access?.role === "commenter") throw new Error("你僅有註解權限，無法修改這段成長史。");
  if (requestedDiaryId) throw new Error("找不到這本家庭成長史，或你沒有編輯權限。");
  return { diary: await getOrCreateDiary(userId), role: "owner" as const };
}

async function assertEventWriteAccess(eventId: number, userId: number) {
  const db = await requireDb();
  const event = await db.select({ id: growthEvents.id, diaryId: growthEvents.diaryId }).from(growthEvents).where(eq(growthEvents.id, eventId)).limit(1);
  if (!event[0]) throw new Error("找不到這筆成長事件。");
  const access = await getWritableDiary(userId, event[0].diaryId);
  if (access.diary.id !== event[0].diaryId) throw new Error("找不到這筆成長事件，或你沒有編輯權限。");
  return { ...event[0], access };
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

function makeLifePhaseSnapshot(diary: typeof growthDiaries.$inferSelect, events: Awaited<ReturnType<typeof getEnrichedDiaryEvents>>) {
  return deriveLifePhases(events, {
    birthYear: diary.birthYear,
    educationStartYear: diary.educationStartYear,
    careerStartYear: diary.careerStartYear,
    childhoodStartYear: diary.childhoodStartYear,
    childhoodEndYear: diary.childhoodEndYear,
    educationEndYear: diary.educationEndYear,
    careerEndYear: diary.careerEndYear,
  });
}

export async function getDiarySnapshot(userId: number, requestedDiaryId?: number) {
  const db = await requireDb();
  const access = await getDiaryAccessForUser(userId, requestedDiaryId);
  if (requestedDiaryId && !access) throw new Error("找不到這本家庭成長史，或你沒有檢視權限。");
  const diary = access?.diary ?? await getOrCreateDiary(userId);
  const accessRole: DiaryAccessRole = access?.role ?? "owner";
  const tags = await db.select().from(growthTags).where(eq(growthTags.userId, diary.userId)).orderBy(asc(growthTags.name));
  const events = await getEnrichedDiaryEvents(db, diary.id);
  const reflections = await db.select().from(growthPhaseReflections).where(eq(growthPhaseReflections.diaryId, diary.id));
  const annualReflections = reflections
    .filter((reflection) => /^annual-\d{4}$/.test(reflection.phaseKey))
    .map((reflection) => ({ ...reflection, year: Number(reflection.phaseKey.slice("annual-".length)) }));
  const accessLogs = await db.select().from(growthShareAccessLogs).where(eq(growthShareAccessLogs.diaryId, diary.id)).orderBy(desc(growthShareAccessLogs.accessedAt)).limit(6);
  return {
    diary,
    accessRole,
    tags,
    events,
    lifePhases: makeLifePhaseSnapshot(diary, events),
    sharing: {
      mode: diary.shareMode,
      slug: diary.shareSlug,
      hasPrivateLink: Boolean(diary.shareTokenHash),
      hasPassword: Boolean(diary.sharePasswordHash),
      expiresAt: diary.shareExpiresAt,
      accessCount: diary.shareAccessCount,
      lastSharedAt: diary.lastSharedAt,
      recentAccesses: accessLogs,
    },
    reflections: reflections.filter((reflection) => !/^annual-\d{4}$/.test(reflection.phaseKey)),
    annualReflections,
  };
}

type EventRevisionChangeType = "create" | "update" | "restore";

async function writeEventRevision(userId: number, eventId: number, changeType: EventRevisionChangeType) {
  const db = await requireDb();
  await assertEventWriteAccess(eventId, userId);
  const event = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId)).limit(1);
  if (!event[0]) throw new Error("找不到這筆成長事件。");
  const tags = await db.select({ name: growthTags.name })
    .from(growthEventTags)
    .innerJoin(growthTags, eq(growthEventTags.tagId, growthTags.id))
    .where(eq(growthEventTags.eventId, eventId))
    .orderBy(asc(growthTags.name));
  const latest = await db.select({ version: growthEventRevisions.version })
    .from(growthEventRevisions)
    .where(eq(growthEventRevisions.eventId, eventId))
    .orderBy(desc(growthEventRevisions.version))
    .limit(1);
  const snapshot = JSON.stringify({
    occurredAt: event[0].occurredAt,
    datePrecision: event[0].datePrecision,
    eventType: event[0].eventType,
    title: event[0].title,
    body: event[0].body,
    ageLabel: event[0].ageLabel,
    place: event[0].place,
    color: event[0].color,
    isPublic: event[0].isPublic,
    timelinePosition: event[0].timelinePosition,
    tagNames: tags.map((tag) => tag.name),
  });
  const version = (latest[0]?.version ?? 0) + 1;
  await db.insert(growthEventRevisions).values({ eventId, version, changeType, snapshot });
  return { eventId, version, changeType, snapshot };
}

export async function getDiaryEventRevisions(userId: number, eventId: number) {
  const db = await requireDb();
  await assertEventWriteAccess(eventId, userId);
  const revisions = await db.select().from(growthEventRevisions)
    .where(eq(growthEventRevisions.eventId, eventId))
    .orderBy(desc(growthEventRevisions.version));
  return revisions.map((revision) => ({
    id: revision.id,
    eventId: revision.eventId,
    version: revision.version,
    changeType: revision.changeType,
    snapshot: parseDiaryEventRevisionSnapshot(revision.snapshot),
    createdAt: revision.createdAt,
  }));
}

export async function restoreDiaryEventRevision(userId: number, eventId: number, revisionId: number) {
  const db = await requireDb();
  const eventAccess = await assertEventWriteAccess(eventId, userId);
  const revision = await db.select().from(growthEventRevisions)
    .where(and(eq(growthEventRevisions.id, revisionId), eq(growthEventRevisions.eventId, eventId)))
    .limit(1);
  if (!revision[0]) throw new Error("找不到可還原的事件版本。");
  const snapshot = parseDiaryEventRevisionSnapshot(revision[0].snapshot);
  await db.update(growthEvents).set({
    occurredAt: snapshot.occurredAt,
    datePrecision: snapshot.datePrecision,
    eventType: snapshot.eventType,
    title: snapshot.title.trim(),
    body: snapshot.body.trim(),
    ageLabel: snapshot.ageLabel?.trim() || null,
    place: snapshot.place?.trim() || null,
    color: snapshot.color,
    isPublic: snapshot.isPublic,
    timelinePosition: snapshot.timelinePosition,
  }).where(eq(growthEvents.id, eventId));
  await saveEventTags(eventId, eventAccess.access.diary.userId, snapshot.tagNames);
  const restored = await writeEventRevision(userId, eventId, "restore");
  return { eventId, restoredVersion: restored.version };
}

export async function createDiaryEvent(userId: number, input: DiaryEventInput, requestedDiaryId?: number) {
  const db = await requireDb();
  const { diary } = await getWritableDiary(userId, requestedDiaryId);
  const existingEvents = await db.select({ id: growthEvents.id }).from(growthEvents).where(eq(growthEvents.diaryId, diary.id));
  await db.insert(growthEvents).values({ diaryId: diary.id, occurredAt: input.occurredAt, datePrecision: input.datePrecision, eventType: input.eventType, title: input.title.trim(), body: input.body.trim(), ageLabel: input.ageLabel?.trim() || null, place: input.place?.trim() || null, color: input.color, timelinePosition: existingEvents.length });
  const created = await db.select().from(growthEvents).where(eq(growthEvents.diaryId, diary.id)).orderBy(desc(growthEvents.id)).limit(1);
  if (!created[0]) throw new Error("無法儲存這筆成長事件。");
  await saveEventTags(created[0].id, diary.userId, input.tagNames);
  await writeEventRevision(userId, created[0].id, "create");
  return { id: created[0].id };
}

export async function importDiaryEvents(userId: number, inputs: DiaryEventInput[], requestedDiaryId?: number) {
  const createdIds: number[] = [];
  try {
    for (const input of inputs) {
      const created = await createDiaryEvent(userId, { ...input, tagNames: input.tagNames.slice(0, 8) }, requestedDiaryId);
      createdIds.push(created.id);
    }
    return { importedCount: createdIds.length, eventIds: createdIds };
  } catch (error) {
    await Promise.all(createdIds.map((eventId) => deleteDiaryEvent(userId, eventId)));
    throw new Error("匯入未完成，這次建立的事件已清除，請檢查備份檔後再試。", { cause: error });
  }
}

export async function updateDiaryEvent(userId: number, eventId: number, input: DiaryEventInput) {
  const db = await requireDb();
  const eventAccess = await assertEventWriteAccess(eventId, userId);
  await db.update(growthEvents).set({ occurredAt: input.occurredAt, datePrecision: input.datePrecision, eventType: input.eventType, title: input.title.trim(), body: input.body.trim(), ageLabel: input.ageLabel?.trim() || null, place: input.place?.trim() || null, color: input.color }).where(eq(growthEvents.id, eventId));
  await saveEventTags(eventId, eventAccess.access.diary.userId, input.tagNames);
  await writeEventRevision(userId, eventId, "update");
  return { id: eventId };
}

export async function deleteDiaryEvent(userId: number, eventId: number) {
  const db = await requireDb();
  await assertEventWriteAccess(eventId, userId);
  await db.delete(growthEventTags).where(eq(growthEventTags.eventId, eventId));
  await db.delete(growthEventMedia).where(eq(growthEventMedia.eventId, eventId));
  await db.delete(growthEvents).where(eq(growthEvents.id, eventId));
  return { id: eventId };
}

export async function setDiaryEventVisibility(userId: number, eventId: number, isPublic: boolean) {
  const db = await requireDb();
  await assertEventWriteAccess(eventId, userId);
  await db.update(growthEvents).set({ isPublic }).where(eq(growthEvents.id, eventId));
  return { id: eventId, isPublic };
}

export async function reorderDiaryEvents(userId: number, eventIds: number[], requestedDiaryId?: number) {
  const db = await requireDb();
  const { diary } = await getWritableDiary(userId, requestedDiaryId);
  const ownedEvents = await db.select({ id: growthEvents.id }).from(growthEvents).where(eq(growthEvents.diaryId, diary.id));
  if (ownedEvents.length !== eventIds.length || new Set(eventIds).size !== eventIds.length || ownedEvents.some((event) => !eventIds.includes(event.id))) {
    throw new Error("事件排序內容不完整，請重新整理後再試。");
  }
  for (let timelinePosition = 0; timelinePosition < eventIds.length; timelinePosition += 1) {
    await db.update(growthEvents).set({ timelinePosition }).where(eq(growthEvents.id, eventIds[timelinePosition]!));
  }
  return { eventIds };
}

export async function updateDiaryPhaseBoundaries(userId: number, input: DiaryPhaseBoundariesInput) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  const invalidBoundary = getInvalidLifePhaseBoundary({ ...diary, ...input });
  if (invalidBoundary) throw new Error(`${invalidBoundary.label}階段的結束年份不能早於開始年份。`);
  await db.update(growthDiaries).set(input).where(eq(growthDiaries.id, diary.id));
  return input;
}

export async function generatePhaseReflection(userId: number, phaseKey: ReflectionPhaseKey) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  return generatePhaseReflectionForDiary(db, diary, phaseKey);
}

export async function generateAnnualReflection(userId: number, year: number) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  return generateAnnualReflectionForDiary(db, diary, year);
}

export async function updatePhaseReflection(userId: number, input: PhaseReflectionInput) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  return updatePhaseReflectionForDiary(db, diary.id, input);
}

export async function updateDiaryAiPreference(userId: number, aiEnabled: boolean) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  return setDiaryAiEnabled(db, diary.id, aiEnabled);
}

/** Updates only owner-controlled narrative metadata; contact and identity details are intentionally not collected. */
export async function updateDiaryProfile(userId: number, input: DiaryProfileInput) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  const title = input.title.trim();
  const subtitle = input.subtitle?.trim() || null;
  await db.update(growthDiaries).set({ title, subtitle }).where(eq(growthDiaries.id, diary.id));
  return { title, subtitle };
}

export async function deletePhaseReflection(userId: number, phaseKey: ReflectionPhaseKey) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  return deletePhaseReflectionForDiary(db, diary.id, phaseKey);
}

export async function deleteAnnualReflection(userId: number, year: number) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  return deleteAnnualReflectionForDiary(db, diary.id, year);
}

export async function updateDiarySharing(userId: number, input: DiarySharingInput) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  return persistDiarySharing(db, diary, input);
}

export async function getSharedDiary(slug: string, token?: string | null, password?: string | null) {
  const db = await requireDb();
  return readSharedDiary(db, slug, token, password);
}

export async function uploadDiaryEventImage(input: { userId: number; eventId: number; fileName: string; mimeType: string; base64: string; caption?: string; }) {
  const db = await requireDb();
  await assertEventWriteAccess(input.eventId, input.userId);
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
  const media = await db.select({ id: growthEventMedia.id, eventId: growthEventMedia.eventId }).from(growthEventMedia).where(eq(growthEventMedia.id, mediaId)).limit(1);
  if (!media[0]) throw new Error("找不到這張圖片，或你沒有刪除權限。");
  await assertEventWriteAccess(media[0].eventId, userId);
  await db.delete(growthEventMedia).where(eq(growthEventMedia.id, mediaId));
  return { id: mediaId };
}

export async function updateDiaryEventMedia(userId: number, mediaId: number, caption: string | null) {
  const db = await requireDb();
  const media = await db.select({ id: growthEventMedia.id, eventId: growthEventMedia.eventId }).from(growthEventMedia).where(eq(growthEventMedia.id, mediaId)).limit(1);
  if (!media[0]) throw new Error("找不到這張圖片，或你沒有編輯權限。");
  await assertEventWriteAccess(media[0].eventId, userId);
  const nextCaption = caption?.trim() || null;
  await db.update(growthEventMedia).set({ caption: nextCaption }).where(eq(growthEventMedia.id, mediaId));
  return { id: mediaId, caption: nextCaption };
}

export async function reorderDiaryEventMedia(userId: number, eventId: number, mediaIds: number[]) {
  const db = await requireDb();
  await assertEventWriteAccess(eventId, userId);
  const media = await db.select({ id: growthEventMedia.id }).from(growthEventMedia).where(eq(growthEventMedia.eventId, eventId));
  if (media.length !== mediaIds.length || new Set(mediaIds).size !== mediaIds.length || media.some((item) => !mediaIds.includes(item.id))) {
    throw new Error("圖片排序內容不完整，請重新整理後再試。");
  }
  for (let sortOrder = 0; sortOrder < mediaIds.length; sortOrder += 1) {
    await db.update(growthEventMedia).set({ sortOrder }).where(eq(growthEventMedia.id, mediaIds[sortOrder]!));
  }
  return { eventId, mediaIds };
}

export async function uploadDiaryCoverImage(input: { userId: number; fileName: string; mimeType: string; base64: string }) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(input.userId);
  const bytes = Buffer.from(input.base64, "base64");
  if (bytes.byteLength > 4 * 1024 * 1024) throw new Error("封面圖片不可超過 4MB。");
  const fileName = safeMediaName(input.fileName);
  const stored = await storagePut(`growth-diary/${input.userId}/cover/${Date.now()}-${fileName}`, bytes, input.mimeType);
  await db.update(growthDiaries).set({ publicCoverStorageKey: stored.key, publicCoverUrl: stored.url }).where(eq(growthDiaries.id, diary.id));
  return stored;
}

async function getOwnedDiary(userId: number) {
  const db = await requireDb();
  const diary = await db.select().from(growthDiaries).where(eq(growthDiaries.userId, userId)).limit(1);
  if (!diary[0]) throw new Error("找不到你的成長史。");
  return diary[0];
}

export async function createDiaryInvite(userId: number, input: { email: string; role: DiaryMemberRole; expiresAt: number }) {
  const db = await requireDb();
  const diary = await getOwnedDiary(userId);
  return createDiaryInviteForDiary(db, diary.id, userId, input);
}

export async function acceptDiaryInvite(userId: number, email: string | null | undefined, token: string) {
  const db = await requireDb();
  return acceptDiaryInviteForUser(db, userId, email, token);
}

export async function createEventComment(userId: number, eventId: number, body: string) {
  const db = await requireDb();
  return createEventCommentForUser(db, userId, eventId, body);
}

export async function getEventComments(userId: number, eventId: number) {
  const db = await requireDb();
  return getEventCommentsForUser(db, userId, eventId);
}

export async function getDiaryMembers(userId: number) {
  const db = await requireDb();
  const diary = await getOwnedDiary(userId);
  return getDiaryMembersForDiary(db, diary.id);
}

export async function removeDiaryMember(userId: number, memberId: number) {
  const db = await requireDb();
  const diary = await getOwnedDiary(userId);
  return removeDiaryMemberForDiary(db, diary.id, userId, memberId);
}

export async function updateDiaryMemberRole(userId: number, memberId: number, role: DiaryMemberRole) {
  const db = await requireDb();
  const diary = await getOwnedDiary(userId);
  return updateDiaryMemberRoleForDiary(db, diary.id, userId, memberId, role);
}

export async function getDiaryAuditLogs(userId: number) {
  const db = await requireDb();
  const diary = await getOwnedDiary(userId);
  return getDiaryAuditLogsForDiary(db, diary.id);
}

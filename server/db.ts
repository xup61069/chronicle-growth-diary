import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  growthDiaries,
  growthDiaryMembers,
  growthEvents,
} from "../drizzle/schema";
import { buildDiarySnapshotForDiary } from "./db/diarySnapshot";
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
import { updateDiaryPhaseBoundariesForDiary, updateDiaryProfileForDiary } from "./db/diarySettings";
import { deleteDiaryEventMediaForUser, reorderDiaryEventMediaForUser, updateDiaryEventMediaForUser, uploadDiaryCoverMedia, uploadDiaryEventMedia } from "./db/diaryMedia";
import {
  createDiaryEventForUser,
  deleteDiaryEventForUser,
  getDiaryEventRevisionsForUser,
  importDiaryEventsForUser,
  reorderDiaryEventsForUser,
  restoreDiaryEventRevisionForUser,
  setDiaryEventVisibilityForUser,
  updateDiaryEventForUser,
} from "./db/diaryEvents";
export type { DiaryPhaseBoundariesInput, DiaryProfileInput } from "./db/diarySettings";
import type { DiaryPhaseBoundariesInput, DiaryProfileInput } from "./db/diarySettings";
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
  skillNames: string[];
  track: "career" | "skills" | "life" | "hardware";
  milestoneType: "standard" | "highlight" | "turning_point" | "gear_workflow" | "reflection";
  milestoneWeight: number;
  comparisonGroup?: string | null;
  unlocksAt?: number | null;
  phaseKeywords?: string[];
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

export async function getDiarySnapshot(userId: number, requestedDiaryId?: number) {
  const db = await requireDb();
  const access = await getDiaryAccessForUser(userId, requestedDiaryId);
  if (requestedDiaryId && !access) throw new Error("找不到這本家庭成長史，或你沒有檢視權限。");
  const diary = access?.diary ?? await getOrCreateDiary(userId);
  const accessRole: DiaryAccessRole = access?.role ?? "owner";
  return buildDiarySnapshotForDiary(db, diary, accessRole);
}

export async function getDiaryEventRevisions(userId: number, eventId: number) {
  const db = await requireDb();
  return getDiaryEventRevisionsForUser(db, assertEventWriteAccess, userId, eventId);
}

export async function restoreDiaryEventRevision(userId: number, eventId: number, revisionId: number) {
  const db = await requireDb();
  return restoreDiaryEventRevisionForUser(db, assertEventWriteAccess, userId, eventId, revisionId);
}

export async function createDiaryEvent(userId: number, input: DiaryEventInput, requestedDiaryId?: number) {
  const db = await requireDb();
  return createDiaryEventForUser(db, getWritableDiary, assertEventWriteAccess, userId, input, requestedDiaryId);
}

export async function importDiaryEvents(userId: number, inputs: DiaryEventInput[], requestedDiaryId?: number) {
  const db = await requireDb();
  return importDiaryEventsForUser(db, createDiaryEvent, deleteDiaryEvent, userId, inputs, requestedDiaryId);
}

export async function updateDiaryEvent(userId: number, eventId: number, input: DiaryEventInput) {
  const db = await requireDb();
  return updateDiaryEventForUser(db, assertEventWriteAccess, userId, eventId, input);
}

export async function deleteDiaryEvent(userId: number, eventId: number) {
  const db = await requireDb();
  return deleteDiaryEventForUser(db, assertEventWriteAccess, userId, eventId);
}

export async function setDiaryEventVisibility(userId: number, eventId: number, isPublic: boolean) {
  const db = await requireDb();
  return setDiaryEventVisibilityForUser(db, assertEventWriteAccess, userId, eventId, isPublic);
}

export async function reorderDiaryEvents(userId: number, eventIds: number[], requestedDiaryId?: number) {
  const db = await requireDb();
  return reorderDiaryEventsForUser(db, getWritableDiary, userId, eventIds, requestedDiaryId);
}

export async function updateDiaryPhaseBoundaries(userId: number, input: DiaryPhaseBoundariesInput) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  return updateDiaryPhaseBoundariesForDiary(db, diary, input);
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
  return updateDiaryProfileForDiary(db, diary.id, input);
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
  return uploadDiaryEventMedia(db, assertEventWriteAccess, input);
}

export async function deleteDiaryEventMedia(userId: number, mediaId: number) {
  const db = await requireDb();
  return deleteDiaryEventMediaForUser(db, assertEventWriteAccess, userId, mediaId);
}

export async function updateDiaryEventMedia(userId: number, mediaId: number, caption: string | null) {
  const db = await requireDb();
  return updateDiaryEventMediaForUser(db, assertEventWriteAccess, userId, mediaId, caption);
}

export async function reorderDiaryEventMedia(userId: number, eventId: number, mediaIds: number[]) {
  const db = await requireDb();
  return reorderDiaryEventMediaForUser(db, assertEventWriteAccess, userId, eventId, mediaIds);
}

export async function uploadDiaryCoverImage(input: { userId: number; fileName: string; mimeType: string; base64: string }) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(input.userId);
  return uploadDiaryCoverMedia(db, diary.id, input);
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

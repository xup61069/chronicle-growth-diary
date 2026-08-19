import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes } from "node:crypto";
import {
  growthDiaries,
  growthDiaryAuditLogs,
  growthDiaryInvites,
  growthDiaryMembers,
  growthEventComments,
  growthEventMedia,
  growthEventRevisions,
  growthEvents,
  growthEventTags,
  growthPhaseReflections,
  growthShareAccessLogs,
  growthTags,
  InsertUser,
  User,
  users,
} from "../drizzle/schema";
import { normalizeTagNames, safeMediaName } from "./diaryHelpers";
import { deriveLifePhases, getInvalidLifePhaseBoundary } from "./lifePhases";
import { hasShareAccess, hashSharePassword, hashShareToken, isShareExpired, verifySharePassword } from "./shareAccess";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
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

export type DiaryMemberRole = "editor" | "commenter";

export type DiarySharingInput = {
  shareMode: "private" | "public" | "link";
  birthYear?: number | null;
  educationStartYear?: number | null;
  careerStartYear?: number | null;
  childhoodStartYear?: number | null;
  childhoodEndYear?: number | null;
  educationEndYear?: number | null;
  careerEndYear?: number | null;
  sharePassword?: string | null;
  clearSharePassword?: boolean;
  shareExpiresAt?: number | null;
  regenerateLink?: boolean;
  publicCoverTitle?: string | null;
  publicStoryLayout?: "editorial" | "gallery" | "minimal";
  clearPublicCover?: boolean;
};

export type DiaryPhaseBoundariesInput = Pick<DiarySharingInput, "childhoodStartYear" | "childhoodEndYear" | "educationStartYear" | "educationEndYear" | "careerStartYear" | "careerEndYear">;

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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createLocalUser(input: {
  openId: string;
  email: string;
  name: string;
  passwordHash: string;
}): Promise<User> {
  const db = await requireDb();
  await db.insert(users).values({
    openId: input.openId,
    email: input.email,
    name: input.name,
    loginMethod: "local",
    passwordHash: input.passwordHash,
    emailVerified: false,
  });
  const user = await getUserByOpenId(input.openId);
  if (!user) throw new Error("無法建立本機帳號。");
  return user;
}

/** Removes the account and all diary metadata through the schema's cascading foreign keys.
 * Uploaded media keys are deliberately left unreferenced, following the storage provider lifecycle contract. */
export async function deleteAccount(userId: number) {
  const db = await requireDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!existing[0]) throw new Error("找不到要刪除的帳號。");
  await db.delete(users).where(eq(users.id, userId));
  return { deleted: true } as const;
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

async function getEnrichedDiaryEvents(diaryId: number, isPublicOnly = false) {
  const db = await requireDb();
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
  const events = await getEnrichedDiaryEvents(diary.id);
  const reflections = await db.select().from(growthPhaseReflections).where(eq(growthPhaseReflections.diaryId, diary.id));
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
    reflections,
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

function parseEventRevisionSnapshot(snapshot: string): DiaryEventInput & { isPublic: boolean; timelinePosition: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new Error("這個版本快照已損毀，無法還原。");
  }
  if (
    !parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
    typeof (parsed as Record<string, unknown>).occurredAt !== "number" ||
    typeof (parsed as Record<string, unknown>).title !== "string" ||
    typeof (parsed as Record<string, unknown>).body !== "string" ||
    !Array.isArray((parsed as Record<string, unknown>).tagNames)
  ) {
    throw new Error("這個版本快照格式無效，無法還原。");
  }
  return parsed as DiaryEventInput & { isPublic: boolean; timelinePosition: number };
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
    snapshot: parseEventRevisionSnapshot(revision.snapshot),
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
  const snapshot = parseEventRevisionSnapshot(revision[0].snapshot);
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

export function assertAiEnabled(aiEnabled: boolean) {
  if (!aiEnabled) throw new Error("你已關閉 AI 回顧。重新啟用後才可根據事件生成文字。 ");
}

export async function generatePhaseReflection(userId: number, phaseKey: "childhood" | "education" | "career") {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  assertAiEnabled(diary.aiEnabled);
  const events = await getEnrichedDiaryEvents(diary.id);
  const phase = makeLifePhaseSnapshot(diary, events).find((item) => item.key === phaseKey);
  if (!phase?.events.length) throw new Error("這個人生階段還沒有足夠事件可供回顧。");
  const source = phase.events.slice(0, 30).map((event, index) => [
    `${index + 1}. ${new Date(event.occurredAt).getFullYear()}｜${event.title}`,
    event.body.slice(0, 550),
    event.tags.length ? `標籤：${event.tags.map((tag) => tag.name).join("、")}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");
  const result = await invokeLLM({
    model: "claude-haiku-4-5",
    maxTokens: 1200,
    messages: [
      { role: "system", content: "你是溫和、精準的個人成長檔案編輯。只能依據提供的事件寫作，不要診斷、推測敏感背景或下結論。以繁體中文輸出具體、尊重使用者主體性的文字。" },
      { role: "user", content: `請根據「${phase.label}」階段的事件，產生兩部分：一段 120–220 字的成長回顧，以及一段 80–160 字、以開放問題與覺察為主的反思。請嚴格依照以下格式輸出，除了兩個標記與內容外不要加入任何文字：\n===RECAP===\n回顧文字\n===REFLECTION===\n反思文字\n\n事件資料：\n${source}` },
    ],
  });
  const content = result.choices[0]?.message.content;
  const match = typeof content === "string" ? content.match(/===RECAP===\s*([\s\S]*?)\s*===REFLECTION===\s*([\s\S]*)/i) : null;
  const labeledMatch = typeof content === "string" ? content.match(/(?:成長回顧|回顧)\s*[:：]\s*([\s\S]*?)(?:反思|自我反思)\s*[:：]\s*([\s\S]*)/i) : null;
  const fallbackRecap = typeof content === "string" ? content.trim() : "";
  const recap = match?.[1]?.trim() || labeledMatch?.[1]?.trim() || fallbackRecap;
  const reflection = match?.[2]?.trim() || labeledMatch?.[2]?.trim() || (fallbackRecap ? "回看這段經驗時，哪些努力、選擇或感受最值得你繼續記下來？" : "");
  if (!recap || !reflection) throw new Error("AI 回顧格式不完整，請稍後再試。");
  await db.insert(growthPhaseReflections).values({ diaryId: diary.id, phaseKey, recap, reflection, model: result.model || "claude-haiku-4-5" }).onDuplicateKeyUpdate({ set: { recap, reflection, model: result.model || "claude-haiku-4-5" } });
  return { phaseKey, recap, reflection, model: result.model || "claude-haiku-4-5" };
}

export async function updatePhaseReflection(userId: number, input: { phaseKey: "childhood" | "education" | "career"; recap: string; reflection: string }) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  const existing = await db.select({ id: growthPhaseReflections.id }).from(growthPhaseReflections).where(and(eq(growthPhaseReflections.diaryId, diary.id), eq(growthPhaseReflections.phaseKey, input.phaseKey))).limit(1);
  if (!existing[0]) throw new Error("請先生成一段 AI 回顧後再進行手動調整。");
  await db.update(growthPhaseReflections).set({ recap: input.recap.trim(), reflection: input.reflection.trim(), model: "manual-edit" }).where(eq(growthPhaseReflections.id, existing[0].id));
  return { phaseKey: input.phaseKey, recap: input.recap.trim(), reflection: input.reflection.trim(), model: "manual-edit" };
}

export async function updateDiaryAiPreference(userId: number, aiEnabled: boolean) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  await db.update(growthDiaries).set({ aiEnabled }).where(eq(growthDiaries.id, diary.id));
  return { aiEnabled };
}

export async function deletePhaseReflection(userId: number, phaseKey: "childhood" | "education" | "career") {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  await db.delete(growthPhaseReflections).where(and(eq(growthPhaseReflections.diaryId, diary.id), eq(growthPhaseReflections.phaseKey, phaseKey)));
  return { phaseKey };
}

export async function updateDiarySharing(userId: number, input: DiarySharingInput) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  const invalidBoundary = getInvalidLifePhaseBoundary({
    ...diary,
    ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)),
  });
  if (invalidBoundary) throw new Error(`${invalidBoundary.label}階段的結束年份不能早於開始年份。`);
  const shareSlug = diary.shareSlug ?? makeShareSlug(diary.id);
  let shareToken: string | undefined;
  let shareTokenHash = diary.shareTokenHash;

  if (input.shareMode === "link" && (!shareTokenHash || input.regenerateLink)) {
    shareToken = makeShareToken();
    shareTokenHash = hashShareToken(shareToken);
  }
  if (input.shareMode !== "link") shareTokenHash = null;
  const sharePasswordHash = input.clearSharePassword ? null : input.sharePassword ? hashSharePassword(input.sharePassword) : diary.sharePasswordHash;
  const shareExpiresAt = input.shareExpiresAt === undefined ? diary.shareExpiresAt : input.shareExpiresAt;
  const publicCoverTitle = input.publicCoverTitle === undefined ? diary.publicCoverTitle : input.publicCoverTitle?.trim() || null;

  await db.update(growthDiaries).set({
    shareMode: input.shareMode,
    shareSlug,
    shareTokenHash,
    sharePasswordHash: input.shareMode === "private" ? null : sharePasswordHash,
    shareExpiresAt: input.shareMode === "private" ? null : shareExpiresAt,
    birthYear: input.birthYear ?? null,
    educationStartYear: input.educationStartYear ?? null,
    careerStartYear: input.careerStartYear ?? null,
    childhoodStartYear: input.childhoodStartYear ?? null,
    childhoodEndYear: input.childhoodEndYear ?? null,
    educationEndYear: input.educationEndYear ?? null,
    careerEndYear: input.careerEndYear ?? null,
    publicCoverStorageKey: input.clearPublicCover ? null : diary.publicCoverStorageKey,
    publicCoverUrl: input.clearPublicCover ? null : diary.publicCoverUrl,
    publicCoverTitle,
    publicStoryLayout: input.publicStoryLayout ?? diary.publicStoryLayout,
  }).where(eq(growthDiaries.id, diary.id));
  return { mode: input.shareMode, slug: shareSlug, shareToken, hasPassword: Boolean(input.shareMode !== "private" && sharePasswordHash), expiresAt: input.shareMode === "private" ? null : shareExpiresAt };
}

export async function getSharedDiary(slug: string, token?: string | null, password?: string | null) {
  const db = await requireDb();
  const matching = await db.select().from(growthDiaries).where(eq(growthDiaries.shareSlug, slug)).limit(1);
  const diary = matching[0];
  if (!diary) return { status: "not_found" as const };
  if (isShareExpired(diary.shareExpiresAt)) return { status: "expired" as const };
  if (!hasShareAccess({ mode: diary.shareMode, storedTokenHash: diary.shareTokenHash, providedToken: token })) return { status: "locked" as const };
  if (diary.sharePasswordHash && !password) return { status: "password_required" as const };
  if (diary.sharePasswordHash && !verifySharePassword(password ?? "", diary.sharePasswordHash)) return { status: "password_invalid" as const };
  const events = await getEnrichedDiaryEvents(diary.id, true);
  await db.update(growthDiaries).set({ shareAccessCount: sql`${growthDiaries.shareAccessCount} + 1`, lastSharedAt: new Date() }).where(eq(growthDiaries.id, diary.id));
  await db.insert(growthShareAccessLogs).values({ diaryId: diary.id, channel: diary.shareMode === "link" ? "link" : "public" });
  return {
    status: "ok" as const,
    diary: { title: diary.title, subtitle: diary.subtitle, shareMode: diary.shareMode, publicCoverUrl: diary.publicCoverUrl, publicCoverTitle: diary.publicCoverTitle, publicStoryLayout: diary.publicStoryLayout },
    events,
    lifePhases: makeLifePhaseSnapshot(diary, events),
  };
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

async function writeDiaryAudit(diaryId: number, actorUserId: number, action: "invite_created" | "invite_accepted" | "member_role_updated" | "member_removed" | "comment_created", targetType: string, targetId?: number, metadata?: Record<string, unknown>) {
  const db = await requireDb();
  await db.insert(growthDiaryAuditLogs).values({ diaryId, actorUserId, action, targetType, targetId: targetId ?? null, metadata: metadata ? JSON.stringify(metadata) : null });
}

async function getDiaryAccess(userId: number, eventId: number) {
  const db = await requireDb();
  const event = await db.select({ diaryId: growthEvents.diaryId }).from(growthEvents).where(eq(growthEvents.id, eventId)).limit(1);
  if (!event[0]) throw new Error("找不到這筆成長事件。");
  const owner = await db.select({ id: growthDiaries.id }).from(growthDiaries).where(and(eq(growthDiaries.id, event[0].diaryId), eq(growthDiaries.userId, userId))).limit(1);
  if (owner[0]) return { diaryId: event[0].diaryId, role: "owner" as const };
  const member = await db.select().from(growthDiaryMembers).where(and(eq(growthDiaryMembers.diaryId, event[0].diaryId), eq(growthDiaryMembers.userId, userId))).limit(1);
  if (!member[0]) throw new Error("你沒有檢視或註解這段成長史的權限。");
  return { diaryId: event[0].diaryId, role: member[0].role };
}

export async function createDiaryInvite(userId: number, input: { email: string; role: DiaryMemberRole; expiresAt: number }) {
  const db = await requireDb();
  const diary = await getOwnedDiary(userId);
  const token = randomBytes(24).toString("base64url");
  await db.insert(growthDiaryInvites).values({ diaryId: diary.id, invitedByUserId: userId, invitedEmail: input.email.trim().toLowerCase(), role: input.role, tokenHash: hashShareToken(token), expiresAt: input.expiresAt });
  const invite = await db.select().from(growthDiaryInvites).where(eq(growthDiaryInvites.tokenHash, hashShareToken(token))).limit(1);
  if (!invite[0]) throw new Error("無法建立家庭邀請。");
  await writeDiaryAudit(diary.id, userId, "invite_created", "invite", invite[0].id, { role: input.role });
  return { id: invite[0].id, token, expiresAt: input.expiresAt, role: input.role };
}

export async function acceptDiaryInvite(userId: number, email: string | null | undefined, token: string) {
  const db = await requireDb();
  const invite = await db.select().from(growthDiaryInvites).where(eq(growthDiaryInvites.tokenHash, hashShareToken(token))).limit(1);
  if (!invite[0] || invite[0].acceptedAt || invite[0].expiresAt <= Date.now()) throw new Error("這個家庭邀請不存在、已使用或已過期。");
  if (!email || invite[0].invitedEmail !== email.trim().toLowerCase()) throw new Error("這個家庭邀請不屬於目前帳號。");
  await db.insert(growthDiaryMembers).values({ diaryId: invite[0].diaryId, userId, role: invite[0].role }).onDuplicateKeyUpdate({ set: { role: invite[0].role } });
  await db.update(growthDiaryInvites).set({ acceptedAt: new Date() }).where(eq(growthDiaryInvites.id, invite[0].id));
  await writeDiaryAudit(invite[0].diaryId, userId, "invite_accepted", "invite", invite[0].id, { role: invite[0].role });
  return { diaryId: invite[0].diaryId, role: invite[0].role };
}

export async function createEventComment(userId: number, eventId: number, body: string) {
  const db = await requireDb();
  const access = await getDiaryAccess(userId, eventId);
  await db.insert(growthEventComments).values({ eventId, authorUserId: userId, body: body.trim() });
  const comment = await db.select().from(growthEventComments).where(eq(growthEventComments.eventId, eventId)).orderBy(desc(growthEventComments.id)).limit(1);
  if (!comment[0]) throw new Error("無法新增註解。");
  await writeDiaryAudit(access.diaryId, userId, "comment_created", "comment", comment[0].id, { eventId });
  return comment[0];
}

export async function getEventComments(userId: number, eventId: number) {
  const db = await requireDb();
  await getDiaryAccess(userId, eventId);
  return db.select({ id: growthEventComments.id, body: growthEventComments.body, createdAt: growthEventComments.createdAt, authorName: users.name })
    .from(growthEventComments).innerJoin(users, eq(growthEventComments.authorUserId, users.id))
    .where(eq(growthEventComments.eventId, eventId)).orderBy(asc(growthEventComments.createdAt));
}

export async function getDiaryMembers(userId: number) {
  const db = await requireDb();
  const diary = await getOwnedDiary(userId);
  return db.select({ id: growthDiaryMembers.id, userId: growthDiaryMembers.userId, role: growthDiaryMembers.role, createdAt: growthDiaryMembers.createdAt, name: users.name, email: users.email })
    .from(growthDiaryMembers).innerJoin(users, eq(growthDiaryMembers.userId, users.id))
    .where(eq(growthDiaryMembers.diaryId, diary.id)).orderBy(asc(growthDiaryMembers.createdAt));
}

export async function removeDiaryMember(userId: number, memberId: number) {
  const db = await requireDb();
  const diary = await getOwnedDiary(userId);
  const member = await db.select().from(growthDiaryMembers).where(and(eq(growthDiaryMembers.id, memberId), eq(growthDiaryMembers.diaryId, diary.id))).limit(1);
  if (!member[0]) throw new Error("找不到這位家庭成員。");
  await db.delete(growthDiaryMembers).where(eq(growthDiaryMembers.id, memberId));
  await writeDiaryAudit(diary.id, userId, "member_removed", "member", memberId, { removedUserId: member[0].userId });
  return { id: memberId };
}

export async function updateDiaryMemberRole(userId: number, memberId: number, role: DiaryMemberRole) {
  const db = await requireDb();
  const diary = await getOwnedDiary(userId);
  const member = await db.select().from(growthDiaryMembers).where(and(eq(growthDiaryMembers.id, memberId), eq(growthDiaryMembers.diaryId, diary.id))).limit(1);
  if (!member[0]) throw new Error("找不到這位家庭成員。");
  await db.update(growthDiaryMembers).set({ role }).where(eq(growthDiaryMembers.id, memberId));
  await writeDiaryAudit(diary.id, userId, "member_role_updated", "member", memberId, { previousRole: member[0].role, role });
  return { id: memberId, role };
}

export async function getDiaryAuditLogs(userId: number) {
  const db = await requireDb();
  const diary = await getOwnedDiary(userId);
  return db.select({ id: growthDiaryAuditLogs.id, action: growthDiaryAuditLogs.action, targetType: growthDiaryAuditLogs.targetType, targetId: growthDiaryAuditLogs.targetId, metadata: growthDiaryAuditLogs.metadata, createdAt: growthDiaryAuditLogs.createdAt, actorName: users.name })
    .from(growthDiaryAuditLogs).innerJoin(users, eq(growthDiaryAuditLogs.actorUserId, users.id))
    .where(eq(growthDiaryAuditLogs.diaryId, diary.id)).orderBy(desc(growthDiaryAuditLogs.createdAt)).limit(50);
}

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes } from "node:crypto";
import {
  growthDiaries,
  growthEventMedia,
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

export async function getDiarySnapshot(userId: number) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  const tags = await db.select().from(growthTags).where(eq(growthTags.userId, userId)).orderBy(asc(growthTags.name));
  const events = await getEnrichedDiaryEvents(diary.id);
  const reflections = await db.select().from(growthPhaseReflections).where(eq(growthPhaseReflections.diaryId, diary.id));
  const accessLogs = await db.select().from(growthShareAccessLogs).where(eq(growthShareAccessLogs.diaryId, diary.id)).orderBy(desc(growthShareAccessLogs.accessedAt)).limit(6);
  return {
    diary,
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

export async function createDiaryEvent(userId: number, input: DiaryEventInput) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
  const existingEvents = await db.select({ id: growthEvents.id }).from(growthEvents).where(eq(growthEvents.diaryId, diary.id));
  await db.insert(growthEvents).values({ diaryId: diary.id, occurredAt: input.occurredAt, datePrecision: input.datePrecision, eventType: input.eventType, title: input.title.trim(), body: input.body.trim(), ageLabel: input.ageLabel?.trim() || null, place: input.place?.trim() || null, color: input.color, timelinePosition: existingEvents.length });
  const created = await db.select().from(growthEvents).where(eq(growthEvents.diaryId, diary.id)).orderBy(desc(growthEvents.id)).limit(1);
  if (!created[0]) throw new Error("無法儲存這筆成長事件。");
  await saveEventTags(created[0].id, userId, input.tagNames);
  return { id: created[0].id };
}

export async function importDiaryEvents(userId: number, inputs: DiaryEventInput[]) {
  const createdIds: number[] = [];
  try {
    for (const input of inputs) {
      const created = await createDiaryEvent(userId, { ...input, tagNames: input.tagNames.slice(0, 8) });
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

export async function reorderDiaryEvents(userId: number, eventIds: number[]) {
  const db = await requireDb();
  const diary = await getOrCreateDiary(userId);
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

export async function updateDiaryEventMedia(userId: number, mediaId: number, caption: string | null) {
  const db = await requireDb();
  const media = await db.select({ id: growthEventMedia.id }).from(growthEventMedia)
    .innerJoin(growthEvents, eq(growthEventMedia.eventId, growthEvents.id))
    .innerJoin(growthDiaries, eq(growthEvents.diaryId, growthDiaries.id))
    .where(and(eq(growthEventMedia.id, mediaId), eq(growthDiaries.userId, userId))).limit(1);
  if (!media[0]) throw new Error("找不到這張圖片，或你沒有編輯權限。");
  const nextCaption = caption?.trim() || null;
  await db.update(growthEventMedia).set({ caption: nextCaption }).where(eq(growthEventMedia.id, mediaId));
  return { id: mediaId, caption: nextCaption };
}

export async function reorderDiaryEventMedia(userId: number, eventId: number, mediaIds: number[]) {
  const db = await requireDb();
  await assertEventOwnership(eventId, userId);
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

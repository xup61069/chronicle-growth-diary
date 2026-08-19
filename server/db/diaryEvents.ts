import { and, asc, desc, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  growthEventMedia,
  growthEventRevisions,
  growthEvents,
  growthEventTags,
  growthTags,
} from "../../drizzle/schema";
import { normalizeTagNames } from "../diaryHelpers";
import { parseDiaryEventRevisionSnapshot } from "./revisions";

type DbClient = MySql2Database<Record<string, unknown>>;
type EventRevisionChangeType = "create" | "update" | "restore";
type DiaryEventInput = {
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
type WritableDiaryAccess = { diary: { id: number; userId: number } };
type EventWriteAccess = { id: number; diaryId: number; access: { diary: { id: number; userId: number } } };
type GetWritableDiary = (userId: number, requestedDiaryId?: number) => Promise<WritableDiaryAccess>;
type AssertEventWriteAccess = (eventId: number, userId: number) => Promise<EventWriteAccess>;

function serializePhaseKeywords(rawKeywords: string[] = []) {
  return JSON.stringify(normalizeTagNames(rawKeywords));
}

function parsePhaseKeywords(rawKeywords: string | null) {
  if (!rawKeywords) return [];
  try {
    const parsed: unknown = JSON.parse(rawKeywords);
    return Array.isArray(parsed) ? normalizeTagNames(parsed.filter((keyword): keyword is string => typeof keyword === "string")) : [];
  } catch {
    return [];
  }
}

export async function saveEventTagsForDiaryUser(db: DbClient, eventId: number, diaryUserId: number, rawTagNames: string[], rawSkillNames: string[] = []) {
  const tagNames = normalizeTagNames(rawTagNames);
  const skillNames = normalizeTagNames(rawSkillNames);
  const desiredKinds = new Map([...tagNames.map((name) => [name, "general"] as const), ...skillNames.map((name) => [name, "skill"] as const)]);
  await db.delete(growthEventTags).where(eq(growthEventTags.eventId, eventId));
  if (desiredKinds.size === 0) return;

  const tagIds: number[] = [];
  for (const [name, kind] of Array.from(desiredKinds.entries())) {
    const existing = await db.select().from(growthTags).where(and(eq(growthTags.userId, diaryUserId), eq(growthTags.name, name))).limit(1);
    if (existing[0]) {
      if (existing[0].kind !== kind) await db.update(growthTags).set({ kind }).where(eq(growthTags.id, existing[0].id));
      tagIds.push(existing[0].id);
      continue;
    }
    await db.insert(growthTags).values({ userId: diaryUserId, name, kind });
    const created = await db.select().from(growthTags).where(and(eq(growthTags.userId, diaryUserId), eq(growthTags.name, name))).limit(1);
    if (created[0]) tagIds.push(created[0].id);
  }

  if (tagIds.length) {
    await db.insert(growthEventTags).values(tagIds.map((tagId) => ({ eventId, tagId })));
  }
}

export async function writeEventRevisionSnapshot(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, userId: number, eventId: number, changeType: EventRevisionChangeType) {
  await assertEventWriteAccess(eventId, userId);
  const event = await db.select().from(growthEvents).where(eq(growthEvents.id, eventId)).limit(1);
  if (!event[0]) throw new Error("找不到這筆成長事件。");

  const tags = await db.select({ name: growthTags.name, kind: growthTags.kind })
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
    track: event[0].track,
    milestoneType: event[0].milestoneType,
    milestoneWeight: event[0].milestoneWeight,
    comparisonGroup: event[0].comparisonGroup,
    unlocksAt: event[0].unlocksAt,
    phaseKeywords: parsePhaseKeywords(event[0].phaseKeywords),
    isPublic: event[0].isPublic,
    timelinePosition: event[0].timelinePosition,
    tagNames: tags.filter((tag) => tag.kind === "general").map((tag) => tag.name),
    skillNames: tags.filter((tag) => tag.kind === "skill").map((tag) => tag.name),
  });
  const version = (latest[0]?.version ?? 0) + 1;
  await db.insert(growthEventRevisions).values({ eventId, version, changeType, snapshot });
  return { eventId, version, changeType, snapshot };
}

export async function getDiaryEventRevisionsForUser(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, userId: number, eventId: number) {
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

export async function restoreDiaryEventRevisionForUser(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, userId: number, eventId: number, revisionId: number) {
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
    track: snapshot.track,
    milestoneType: snapshot.milestoneType,
    milestoneWeight: snapshot.milestoneWeight,
    comparisonGroup: snapshot.comparisonGroup?.trim() || null,
    unlocksAt: snapshot.unlocksAt ?? null,
    phaseKeywords: serializePhaseKeywords(snapshot.phaseKeywords),
    isPublic: snapshot.isPublic,
    timelinePosition: snapshot.timelinePosition,
  }).where(eq(growthEvents.id, eventId));
  await saveEventTagsForDiaryUser(db, eventId, eventAccess.access.diary.userId, snapshot.tagNames, snapshot.skillNames);
  const restored = await writeEventRevisionSnapshot(db, assertEventWriteAccess, userId, eventId, "restore");
  return { eventId, restoredVersion: restored.version };
}

export async function createDiaryEventForUser(db: DbClient, getWritableDiary: GetWritableDiary, assertEventWriteAccess: AssertEventWriteAccess, userId: number, input: DiaryEventInput, requestedDiaryId?: number) {
  const { diary } = await getWritableDiary(userId, requestedDiaryId);
  const existingEvents = await db.select({ id: growthEvents.id }).from(growthEvents).where(eq(growthEvents.diaryId, diary.id));
  await db.insert(growthEvents).values({
    diaryId: diary.id,
    occurredAt: input.occurredAt,
    datePrecision: input.datePrecision,
    eventType: input.eventType,
    title: input.title.trim(),
    body: input.body.trim(),
    ageLabel: input.ageLabel?.trim() || null,
    place: input.place?.trim() || null,
    color: input.color,
    track: input.track,
    milestoneType: input.milestoneType,
    milestoneWeight: input.milestoneWeight,
    comparisonGroup: input.comparisonGroup?.trim() || null,
    unlocksAt: input.unlocksAt ?? null,
    phaseKeywords: serializePhaseKeywords(input.phaseKeywords),
    timelinePosition: existingEvents.length,
  });
  const created = await db.select().from(growthEvents).where(eq(growthEvents.diaryId, diary.id)).orderBy(desc(growthEvents.id)).limit(1);
  if (!created[0]) throw new Error("無法儲存這筆成長事件。");
  await saveEventTagsForDiaryUser(db, created[0].id, diary.userId, input.tagNames, input.skillNames);
  await writeEventRevisionSnapshot(db, assertEventWriteAccess, userId, created[0].id, "create");
  return { id: created[0].id };
}

export async function importDiaryEventsForUser(db: DbClient, createDiaryEvent: (userId: number, input: DiaryEventInput, requestedDiaryId?: number) => Promise<{ id: number }>, deleteDiaryEvent: (userId: number, eventId: number) => Promise<{ id: number }>, userId: number, inputs: DiaryEventInput[], requestedDiaryId?: number) {
  const createdIds: number[] = [];
  try {
    for (const input of inputs) {
      const created = await createDiaryEvent(userId, { ...input, tagNames: input.tagNames.slice(0, 8), skillNames: input.skillNames.slice(0, 8), phaseKeywords: input.phaseKeywords?.slice(0, 8) ?? [] }, requestedDiaryId);
      createdIds.push(created.id);
    }
    return { importedCount: createdIds.length, eventIds: createdIds };
  } catch (error) {
    await Promise.all(createdIds.map((eventId) => deleteDiaryEvent(userId, eventId)));
    throw new Error("匯入未完成，這次建立的事件已清除，請檢查備份檔後再試。", { cause: error });
  }
}

export async function updateDiaryEventForUser(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, userId: number, eventId: number, input: DiaryEventInput) {
  const eventAccess = await assertEventWriteAccess(eventId, userId);
  await db.update(growthEvents).set({
    occurredAt: input.occurredAt,
    datePrecision: input.datePrecision,
    eventType: input.eventType,
    title: input.title.trim(),
    body: input.body.trim(),
    ageLabel: input.ageLabel?.trim() || null,
    place: input.place?.trim() || null,
    color: input.color,
    track: input.track,
    milestoneType: input.milestoneType,
    milestoneWeight: input.milestoneWeight,
    comparisonGroup: input.comparisonGroup?.trim() || null,
    unlocksAt: input.unlocksAt ?? null,
    phaseKeywords: serializePhaseKeywords(input.phaseKeywords),
  }).where(eq(growthEvents.id, eventId));
  await saveEventTagsForDiaryUser(db, eventId, eventAccess.access.diary.userId, input.tagNames, input.skillNames);
  await writeEventRevisionSnapshot(db, assertEventWriteAccess, userId, eventId, "update");
  return { id: eventId };
}

export async function deleteDiaryEventForUser(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, userId: number, eventId: number) {
  await assertEventWriteAccess(eventId, userId);
  await db.delete(growthEventTags).where(eq(growthEventTags.eventId, eventId));
  await db.delete(growthEventMedia).where(eq(growthEventMedia.eventId, eventId));
  await db.delete(growthEvents).where(eq(growthEvents.id, eventId));
  return { id: eventId };
}

export async function setDiaryEventVisibilityForUser(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, userId: number, eventId: number, isPublic: boolean) {
  await assertEventWriteAccess(eventId, userId);
  await db.update(growthEvents).set({ isPublic }).where(eq(growthEvents.id, eventId));
  return { id: eventId, isPublic };
}

export async function reorderDiaryEventsForUser(db: DbClient, getWritableDiary: GetWritableDiary, userId: number, eventIds: number[], requestedDiaryId?: number) {
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

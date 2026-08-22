import { and, asc, desc, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthEvents, growthFamilyMilestones } from "../../drizzle/schema";
import { writeDiaryAudit } from "./familyCollaboration";

type DbClient = MySql2Database<Record<string, unknown>>;
export type FamilyMilestoneInput = { occurredAt: number; datePrecision: "day" | "month" | "year"; title: string; summary: string; sourceEventId: number | null };

function assertInput(input: FamilyMilestoneInput) {
  if (!Number.isSafeInteger(input.occurredAt) || input.occurredAt < -2208988800000 || input.occurredAt > 4102444800000) throw new Error("家庭大事記日期無效。");
  if (!input.title.trim() || input.title.trim().length > 180 || input.summary.trim().length > 480) throw new Error("家庭大事記的標題或摘要長度無效。");
}

async function assertSourceEventInDiary(db: DbClient, diaryId: number, sourceEventId: number | null) {
  if (sourceEventId === null) return;
  const event = await db.select({ id: growthEvents.id }).from(growthEvents).where(and(eq(growthEvents.id, sourceEventId), eq(growthEvents.diaryId, diaryId))).limit(1);
  if (!event[0]) throw new Error("只能連結目前家庭成長史內的事件。");
}

export async function listFamilyMilestonesForDiary(db: DbClient, diaryId: number) {
  return db.select({ id: growthFamilyMilestones.id, occurredAt: growthFamilyMilestones.occurredAt, datePrecision: growthFamilyMilestones.datePrecision, title: growthFamilyMilestones.title, summary: growthFamilyMilestones.summary, sourceEventId: growthFamilyMilestones.sourceEventId, updatedAt: growthFamilyMilestones.updatedAt })
    .from(growthFamilyMilestones).where(eq(growthFamilyMilestones.diaryId, diaryId)).orderBy(asc(growthFamilyMilestones.occurredAt), asc(growthFamilyMilestones.id));
}

export async function createFamilyMilestoneForDiary(db: DbClient, diaryId: number, userId: number, input: FamilyMilestoneInput) {
  assertInput(input);
  await assertSourceEventInDiary(db, diaryId, input.sourceEventId);
  await db.insert(growthFamilyMilestones).values({ diaryId, createdByUserId: userId, occurredAt: input.occurredAt, datePrecision: input.datePrecision, title: input.title.trim(), summary: input.summary.trim(), sourceEventId: input.sourceEventId });
  const created = await db.select({ id: growthFamilyMilestones.id }).from(growthFamilyMilestones)
    .where(and(eq(growthFamilyMilestones.diaryId, diaryId), eq(growthFamilyMilestones.createdByUserId, userId)))
    .orderBy(desc(growthFamilyMilestones.id)).limit(1);
  if (!created[0]) throw new Error("無法建立家庭大事記。");
  await writeDiaryAudit(db, diaryId, userId, "family_milestone_created", "family_milestone", created[0].id, { hasSourceEvent: input.sourceEventId !== null });
  return created[0];
}

async function requireFamilyMilestoneForDiary(db: DbClient, diaryId: number, milestoneId: number) {
  const milestone = await db.select().from(growthFamilyMilestones).where(and(eq(growthFamilyMilestones.id, milestoneId), eq(growthFamilyMilestones.diaryId, diaryId))).limit(1);
  if (!milestone[0]) throw new Error("找不到這筆家庭大事記。");
  return milestone[0];
}

export async function updateFamilyMilestoneForDiary(db: DbClient, diaryId: number, userId: number, milestoneId: number, input: FamilyMilestoneInput) {
  assertInput(input);
  await requireFamilyMilestoneForDiary(db, diaryId, milestoneId);
  await assertSourceEventInDiary(db, diaryId, input.sourceEventId);
  await db.update(growthFamilyMilestones).set({ occurredAt: input.occurredAt, datePrecision: input.datePrecision, title: input.title.trim(), summary: input.summary.trim(), sourceEventId: input.sourceEventId }).where(eq(growthFamilyMilestones.id, milestoneId));
  await writeDiaryAudit(db, diaryId, userId, "family_milestone_updated", "family_milestone", milestoneId, { hasSourceEvent: input.sourceEventId !== null });
  return { id: milestoneId };
}

export async function deleteFamilyMilestoneForDiary(db: DbClient, diaryId: number, userId: number, milestoneId: number) {
  await requireFamilyMilestoneForDiary(db, diaryId, milestoneId);
  await db.delete(growthFamilyMilestones).where(eq(growthFamilyMilestones.id, milestoneId));
  await writeDiaryAudit(db, diaryId, userId, "family_milestone_deleted", "family_milestone", milestoneId);
  return { id: milestoneId };
}

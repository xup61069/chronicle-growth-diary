import { and, asc, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthDiaryMembers, growthEvents, growthFamilyMilestoneAudiences, growthFamilyMilestones } from "../../drizzle/schema";
import { writeDiaryAudit } from "./familyCollaboration";

type DbClient = MySql2Database<Record<string, unknown>>;
export type FamilyMilestoneAudienceMode = "all_accepted" | "selected_members";
export type FamilyMilestoneInput = {
  occurredAt: number;
  datePrecision: "day" | "month" | "year";
  title: string;
  summary: string;
  sourceEventId: number | null;
  audienceMode: FamilyMilestoneAudienceMode;
  audienceMemberIds: number[];
};

const MAX_SELECTED_MEMBERS = 100;

function normalizedAudienceIds(input: FamilyMilestoneInput) {
  return Array.from(new Set(input.audienceMemberIds)).sort((a, b) => a - b);
}

function assertInput(input: FamilyMilestoneInput) {
  if (!Number.isSafeInteger(input.occurredAt) || input.occurredAt < -2208988800000 || input.occurredAt > 4102444800000) throw new Error("家庭大事記日期無效。");
  if (!input.title.trim() || input.title.trim().length > 180 || input.summary.trim().length > 480) throw new Error("家庭大事記的標題或摘要長度無效。");
  if (input.audienceMode !== "all_accepted" && input.audienceMode !== "selected_members") throw new Error("家庭大事記的可見範圍無效。");
  if (input.audienceMemberIds.some((memberId) => !Number.isSafeInteger(memberId) || memberId <= 0)) throw new Error("家庭大事記的指定成員無效。");
  const ids = normalizedAudienceIds(input);
  if (ids.length !== input.audienceMemberIds.length || ids.length > MAX_SELECTED_MEMBERS) throw new Error("家庭大事記的指定成員重複或超過上限。");
  if (input.audienceMode === "selected_members" && ids.length === 0) throw new Error("請至少選擇一位可查看此家庭大事記的成員。");
  if (input.audienceMode === "all_accepted" && ids.length > 0) throw new Error("所有已接受成員模式不能指定個別成員。");
}

async function assertSourceEventInDiary(db: DbClient, diaryId: number, sourceEventId: number | null) {
  if (sourceEventId === null) return;
  const event = await db.select({ id: growthEvents.id }).from(growthEvents).where(and(eq(growthEvents.id, sourceEventId), eq(growthEvents.diaryId, diaryId))).limit(1);
  if (!event[0]) throw new Error("只能連結目前家庭成長史內的事件。");
}

async function assertAudienceMembersInDiary(db: DbClient, diaryId: number, memberIds: number[]) {
  if (memberIds.length === 0) return;
  const members = await db.select({ id: growthDiaryMembers.id }).from(growthDiaryMembers)
    .where(and(eq(growthDiaryMembers.diaryId, diaryId), inArray(growthDiaryMembers.id, memberIds)));
  if (members.length !== memberIds.length) throw new Error("指定成員必須是目前已接受的家庭成員。");
}

async function listAudienceIdsForMilestone(db: DbClient, milestoneId: number) {
  const audiences = await db.select({ diaryMemberId: growthFamilyMilestoneAudiences.diaryMemberId })
    .from(growthFamilyMilestoneAudiences).where(eq(growthFamilyMilestoneAudiences.milestoneId, milestoneId));
  return audiences.map((audience) => audience.diaryMemberId).sort((a, b) => a - b);
}

async function replaceAudienceForMilestone(db: DbClient, milestoneId: number, memberIds: number[]) {
  await db.delete(growthFamilyMilestoneAudiences).where(eq(growthFamilyMilestoneAudiences.milestoneId, milestoneId));
  if (memberIds.length > 0) await db.insert(growthFamilyMilestoneAudiences).values(memberIds.map((diaryMemberId) => ({ milestoneId, diaryMemberId })));
}

export async function listFamilyMilestonesForDiary(db: DbClient, diaryId: number) {
  const milestones = await db.select({ id: growthFamilyMilestones.id, occurredAt: growthFamilyMilestones.occurredAt, datePrecision: growthFamilyMilestones.datePrecision, title: growthFamilyMilestones.title, summary: growthFamilyMilestones.summary, sourceEventId: growthFamilyMilestones.sourceEventId, audienceMode: growthFamilyMilestones.audienceMode, updatedAt: growthFamilyMilestones.updatedAt })
    .from(growthFamilyMilestones).where(eq(growthFamilyMilestones.diaryId, diaryId)).orderBy(asc(growthFamilyMilestones.occurredAt), asc(growthFamilyMilestones.id));
  if (milestones.length === 0) return [];
  const audiences = await db.select({ milestoneId: growthFamilyMilestoneAudiences.milestoneId, diaryMemberId: growthFamilyMilestoneAudiences.diaryMemberId })
    .from(growthFamilyMilestoneAudiences).where(inArray(growthFamilyMilestoneAudiences.milestoneId, milestones.map((milestone) => milestone.id)));
  const audienceIdsByMilestone = new Map<number, number[]>();
  audiences.forEach((audience) => audienceIdsByMilestone.set(audience.milestoneId, [...(audienceIdsByMilestone.get(audience.milestoneId) ?? []), audience.diaryMemberId]));
  return milestones.map((milestone) => ({ ...milestone, audienceMemberIds: (audienceIdsByMilestone.get(milestone.id) ?? []).sort((a, b) => a - b) }));
}

/** Member projection deliberately omits source-event and audience metadata. */
export async function listFamilyMilestonesForMember(db: DbClient, diaryId: number, diaryMemberId: number) {
  return db.select({ id: growthFamilyMilestones.id, occurredAt: growthFamilyMilestones.occurredAt, datePrecision: growthFamilyMilestones.datePrecision, title: growthFamilyMilestones.title, summary: growthFamilyMilestones.summary, updatedAt: growthFamilyMilestones.updatedAt })
    .from(growthFamilyMilestones)
    .leftJoin(growthFamilyMilestoneAudiences, and(eq(growthFamilyMilestoneAudiences.milestoneId, growthFamilyMilestones.id), eq(growthFamilyMilestoneAudiences.diaryMemberId, diaryMemberId)))
    .where(and(eq(growthFamilyMilestones.diaryId, diaryId), or(eq(growthFamilyMilestones.audienceMode, "all_accepted"), isNotNull(growthFamilyMilestoneAudiences.id))))
    .orderBy(asc(growthFamilyMilestones.occurredAt), asc(growthFamilyMilestones.id));
}

export async function createFamilyMilestoneForDiary(db: DbClient, diaryId: number, userId: number, input: FamilyMilestoneInput) {
  assertInput(input);
  const audienceMemberIds = normalizedAudienceIds(input);
  await assertSourceEventInDiary(db, diaryId, input.sourceEventId);
  await assertAudienceMembersInDiary(db, diaryId, audienceMemberIds);
  return db.transaction(async (tx) => {
    await tx.insert(growthFamilyMilestones).values({ diaryId, createdByUserId: userId, occurredAt: input.occurredAt, datePrecision: input.datePrecision, title: input.title.trim(), summary: input.summary.trim(), sourceEventId: input.sourceEventId, audienceMode: input.audienceMode });
    const created = await tx.select({ id: growthFamilyMilestones.id }).from(growthFamilyMilestones)
      .where(and(eq(growthFamilyMilestones.diaryId, diaryId), eq(growthFamilyMilestones.createdByUserId, userId)))
      .orderBy(desc(growthFamilyMilestones.id)).limit(1);
    if (!created[0]) throw new Error("無法建立家庭大事記。");
    await replaceAudienceForMilestone(tx, created[0].id, audienceMemberIds);
    await writeDiaryAudit(tx, diaryId, userId, "family_milestone_created", "family_milestone", created[0].id, { audienceMode: input.audienceMode, hasSourceEvent: input.sourceEventId !== null });
    return created[0];
  });
}

async function requireFamilyMilestoneForDiary(db: DbClient, diaryId: number, milestoneId: number) {
  const milestone = await db.select().from(growthFamilyMilestones).where(and(eq(growthFamilyMilestones.id, milestoneId), eq(growthFamilyMilestones.diaryId, diaryId))).limit(1);
  if (!milestone[0]) throw new Error("找不到這筆家庭大事記。");
  return milestone[0];
}

export async function updateFamilyMilestoneForDiary(db: DbClient, diaryId: number, userId: number, milestoneId: number, input: FamilyMilestoneInput) {
  assertInput(input);
  const audienceMemberIds = normalizedAudienceIds(input);
  const existing = await requireFamilyMilestoneForDiary(db, diaryId, milestoneId);
  await assertSourceEventInDiary(db, diaryId, input.sourceEventId);
  await assertAudienceMembersInDiary(db, diaryId, audienceMemberIds);
  const currentAudienceMemberIds = await listAudienceIdsForMilestone(db, milestoneId);
  const audienceChanged = existing.audienceMode !== input.audienceMode || currentAudienceMemberIds.join(",") !== audienceMemberIds.join(",");
  return db.transaction(async (tx) => {
    await tx.update(growthFamilyMilestones).set({ occurredAt: input.occurredAt, datePrecision: input.datePrecision, title: input.title.trim(), summary: input.summary.trim(), sourceEventId: input.sourceEventId, audienceMode: input.audienceMode }).where(eq(growthFamilyMilestones.id, milestoneId));
    if (audienceChanged) {
      await replaceAudienceForMilestone(tx, milestoneId, audienceMemberIds);
      await writeDiaryAudit(tx, diaryId, userId, "family_milestone_audience_updated", "family_milestone", milestoneId, { audienceMode: input.audienceMode });
    }
    await writeDiaryAudit(tx, diaryId, userId, "family_milestone_updated", "family_milestone", milestoneId, { audienceMode: input.audienceMode, hasSourceEvent: input.sourceEventId !== null });
    return { id: milestoneId };
  });
}

export async function deleteFamilyMilestoneForDiary(db: DbClient, diaryId: number, userId: number, milestoneId: number) {
  await requireFamilyMilestoneForDiary(db, diaryId, milestoneId);
  await db.delete(growthFamilyMilestones).where(eq(growthFamilyMilestones.id, milestoneId));
  await writeDiaryAudit(db, diaryId, userId, "family_milestone_deleted", "family_milestone", milestoneId);
  return { id: milestoneId };
}

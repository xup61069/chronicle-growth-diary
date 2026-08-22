import { and, asc, desc, eq, gte, isNull, lte } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { randomBytes } from "node:crypto";
import {
  growthDiaries,
  growthDiaryAuditLogs,
  growthDiaryInvites,
  growthDiaryMembers,
  growthEventComments,
  growthEventReactions,
  growthEvents,
  users,
} from "../../drizzle/schema";
import { hashShareToken } from "../shareAccess";

type DbClient = MySql2Database<Record<string, unknown>>;
export type DiaryMemberRole = "editor" | "commenter";
export type AuditAction = "invite_created" | "invite_accepted" | "member_role_updated" | "member_removed" | "comment_created" | "comment_deleted" | "reaction_added" | "reaction_removed" | "family_milestone_created" | "family_milestone_updated" | "family_milestone_deleted" | "family_milestone_audience_updated";
export const EVENT_REACTION_TYPES = ["heart", "spark", "celebrate", "support"] as const;
export type EventReactionType = (typeof EVENT_REACTION_TYPES)[number];

export async function writeDiaryAudit(db: DbClient, diaryId: number, actorUserId: number, action: AuditAction, targetType: string, targetId?: number, metadata?: Record<string, unknown>) {
  await db.insert(growthDiaryAuditLogs).values({
    diaryId,
    actorUserId,
    action,
    targetType,
    targetId: targetId ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

async function getEventAccess(db: DbClient, userId: number, eventId: number) {
  const event = await db.select({ diaryId: growthEvents.diaryId, shareScope: growthEvents.shareScope }).from(growthEvents).where(eq(growthEvents.id, eventId)).limit(1);
  if (!event[0]) throw new Error("找不到這筆成長事件。");
  const owner = await db.select({ id: growthDiaries.id }).from(growthDiaries)
    .where(and(eq(growthDiaries.id, event[0].diaryId), eq(growthDiaries.userId, userId))).limit(1);
  if (owner[0]) return { diaryId: event[0].diaryId, shareScope: event[0].shareScope, role: "owner" as const };
  const member = await db.select().from(growthDiaryMembers)
    .where(and(eq(growthDiaryMembers.diaryId, event[0].diaryId), eq(growthDiaryMembers.userId, userId))).limit(1);
  if (!member[0]) throw new Error("你沒有檢視或註解這段成長史的權限。");
  return { diaryId: event[0].diaryId, shareScope: event[0].shareScope, role: member[0].role };
}

export async function createDiaryInviteForDiary(db: DbClient, diaryId: number, userId: number, input: { email: string; role: DiaryMemberRole; expiresAt: number }) {
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashShareToken(token);
  await db.insert(growthDiaryInvites).values({
    diaryId,
    invitedByUserId: userId,
    invitedEmail: input.email.trim().toLowerCase(),
    role: input.role,
    tokenHash,
    expiresAt: input.expiresAt,
  });
  const invite = await db.select().from(growthDiaryInvites).where(eq(growthDiaryInvites.tokenHash, tokenHash)).limit(1);
  if (!invite[0]) throw new Error("無法建立家庭邀請。");
  await writeDiaryAudit(db, diaryId, userId, "invite_created", "invite", invite[0].id, { role: input.role });
  return { id: invite[0].id, token, expiresAt: input.expiresAt, role: input.role };
}

export async function acceptDiaryInviteForUser(db: DbClient, userId: number, email: string | null | undefined, token: string) {
  const invite = await db.select().from(growthDiaryInvites).where(eq(growthDiaryInvites.tokenHash, hashShareToken(token))).limit(1);
  if (!invite[0] || invite[0].acceptedAt || invite[0].expiresAt <= Date.now()) throw new Error("這個家庭邀請不存在、已使用或已過期。");
  if (!email || invite[0].invitedEmail !== email.trim().toLowerCase()) throw new Error("這個家庭邀請不屬於目前帳號。");
  await db.insert(growthDiaryMembers).values({ diaryId: invite[0].diaryId, userId, role: invite[0].role })
    .onDuplicateKeyUpdate({ set: { role: invite[0].role } });
  await db.update(growthDiaryInvites).set({ acceptedAt: new Date() }).where(eq(growthDiaryInvites.id, invite[0].id));
  await writeDiaryAudit(db, invite[0].diaryId, userId, "invite_accepted", "invite", invite[0].id, { role: invite[0].role });
  return { diaryId: invite[0].diaryId, role: invite[0].role };
}

export async function createEventCommentForUser(db: DbClient, userId: number, eventId: number, body: string) {
  const access = await getPrivateEventMemberAccess(db, userId, eventId);
  const cleanBody = body.trim();
  if (!cleanBody || cleanBody.length > 2000) throw new Error("家庭註解必須介於 1 至 2000 個字元。");
  await db.insert(growthEventComments).values({ eventId, authorUserId: userId, body: cleanBody });
  const comment = await db.select().from(growthEventComments).where(eq(growthEventComments.eventId, eventId)).orderBy(desc(growthEventComments.id)).limit(1);
  if (!comment[0]) throw new Error("無法新增註解。");
  await writeDiaryAudit(db, access.diaryId, userId, "comment_created", "comment", comment[0].id, { eventId });
  return comment[0];
}

export async function getEventCommentsForUser(db: DbClient, userId: number, eventId: number) {
  const access = await getPrivateEventMemberAccess(db, userId, eventId);
  const comments = await db.select({ id: growthEventComments.id, body: growthEventComments.body, createdAt: growthEventComments.createdAt, authorName: users.name, authorUserId: growthEventComments.authorUserId })
    .from(growthEventComments).innerJoin(users, eq(growthEventComments.authorUserId, users.id))
    .where(and(eq(growthEventComments.eventId, eventId), isNull(growthEventComments.deletedAt))).orderBy(asc(growthEventComments.createdAt));
  return comments.map((comment) => ({
    ...comment,
    canDelete: access.role === "owner" || comment.authorUserId === userId,
    isOwnerModeration: access.role === "owner" && comment.authorUserId !== userId,
  }));
}

async function getPrivateEventMemberAccess(db: DbClient, userId: number, eventId: number) {
  const access = await getEventAccess(db, userId, eventId);
  if (access.shareScope !== "private") throw new Error("家庭反應只可用於完全私人的事件。");
  return access;
}

/** Authors may remove their own active comment; the diary owner may moderate any active comment. */
export async function deleteEventCommentForUser(db: DbClient, userId: number, eventId: number, commentId: number) {
  const access = await getPrivateEventMemberAccess(db, userId, eventId);
  const comment = await db.select({ id: growthEventComments.id, authorUserId: growthEventComments.authorUserId })
    .from(growthEventComments)
    .where(and(eq(growthEventComments.id, commentId), eq(growthEventComments.eventId, eventId), isNull(growthEventComments.deletedAt))).limit(1);
  if (!comment[0]) throw new Error("找不到可刪除的家庭註解。");
  if (access.role !== "owner" && comment[0].authorUserId !== userId) throw new Error("你只能刪除自己留下的家庭註解。");
  await db.update(growthEventComments).set({ deletedAt: new Date(), deletedByUserId: userId })
    .where(and(eq(growthEventComments.id, commentId), isNull(growthEventComments.deletedAt)));
  await writeDiaryAudit(db, access.diaryId, userId, "comment_deleted", "comment", commentId, { eventId, moderated: access.role === "owner" && comment[0].authorUserId !== userId });
  return { id: commentId };
}

export async function getEventReactionsForUser(db: DbClient, userId: number, eventId: number) {
  await getPrivateEventMemberAccess(db, userId, eventId);
  const reactions = await db.select({ reaction: growthEventReactions.reaction, authorUserId: growthEventReactions.authorUserId })
    .from(growthEventReactions).where(eq(growthEventReactions.eventId, eventId));
  return EVENT_REACTION_TYPES.map((reaction) => {
    const matching = reactions.filter((item) => item.reaction === reaction);
    return { reaction, count: matching.length, reactedByCurrentUser: matching.some((item) => item.authorUserId === userId) };
  });
}

export async function toggleEventReactionForUser(db: DbClient, userId: number, eventId: number, reaction: EventReactionType) {
  const access = await getPrivateEventMemberAccess(db, userId, eventId);
  const existing = await db.select({ id: growthEventReactions.id }).from(growthEventReactions)
    .where(and(eq(growthEventReactions.eventId, eventId), eq(growthEventReactions.authorUserId, userId), eq(growthEventReactions.reaction, reaction))).limit(1);
  if (existing[0]) {
    await db.delete(growthEventReactions).where(eq(growthEventReactions.id, existing[0].id));
    await writeDiaryAudit(db, access.diaryId, userId, "reaction_removed", "reaction", existing[0].id, { eventId, reaction });
    return { reaction, reacted: false };
  }
  await db.insert(growthEventReactions).values({ eventId, authorUserId: userId, reaction });
  await writeDiaryAudit(db, access.diaryId, userId, "reaction_added", "reaction", undefined, { eventId, reaction });
  return { reaction, reacted: true };
}

export async function getDiaryMembersForDiary(db: DbClient, diaryId: number) {
  return db.select({ id: growthDiaryMembers.id, userId: growthDiaryMembers.userId, role: growthDiaryMembers.role, createdAt: growthDiaryMembers.createdAt, name: users.name, email: users.email })
    .from(growthDiaryMembers).innerJoin(users, eq(growthDiaryMembers.userId, users.id))
    .where(eq(growthDiaryMembers.diaryId, diaryId)).orderBy(asc(growthDiaryMembers.createdAt));
}

export async function removeDiaryMemberForDiary(db: DbClient, diaryId: number, userId: number, memberId: number) {
  const member = await db.select().from(growthDiaryMembers).where(and(eq(growthDiaryMembers.id, memberId), eq(growthDiaryMembers.diaryId, diaryId))).limit(1);
  if (!member[0]) throw new Error("找不到這位家庭成員。");
  await db.delete(growthDiaryMembers).where(eq(growthDiaryMembers.id, memberId));
  await writeDiaryAudit(db, diaryId, userId, "member_removed", "member", memberId, { removedUserId: member[0].userId });
  return { id: memberId };
}

export async function updateDiaryMemberRoleForDiary(db: DbClient, diaryId: number, userId: number, memberId: number, role: DiaryMemberRole) {
  const member = await db.select().from(growthDiaryMembers).where(and(eq(growthDiaryMembers.id, memberId), eq(growthDiaryMembers.diaryId, diaryId))).limit(1);
  if (!member[0]) throw new Error("找不到這位家庭成員。");
  await db.update(growthDiaryMembers).set({ role }).where(eq(growthDiaryMembers.id, memberId));
  await writeDiaryAudit(db, diaryId, userId, "member_role_updated", "member", memberId, { previousRole: member[0].role, role });
  return { id: memberId, role };
}

export async function getDiaryAuditLogsForDiary(db: DbClient, diaryId: number) {
  return db.select({ id: growthDiaryAuditLogs.id, action: growthDiaryAuditLogs.action, targetType: growthDiaryAuditLogs.targetType, targetId: growthDiaryAuditLogs.targetId, metadata: growthDiaryAuditLogs.metadata, createdAt: growthDiaryAuditLogs.createdAt, actorName: users.name })
    .from(growthDiaryAuditLogs).innerJoin(users, eq(growthDiaryAuditLogs.actorUserId, users.id))
    .where(eq(growthDiaryAuditLogs.diaryId, diaryId)).orderBy(desc(growthDiaryAuditLogs.createdAt)).limit(50);
}

/** Owner-only minimum projection for reviewing confirmed family audience scope changes. */
export async function getFamilyMilestoneAudienceAuditForDiary(db: DbClient, diaryId: number, range?: { from?: number; to?: number }) {
  const conditions = [eq(growthDiaryAuditLogs.diaryId, diaryId), eq(growthDiaryAuditLogs.action, "family_milestone_audience_updated"), eq(growthDiaryAuditLogs.targetType, "family_milestone")];
  if (range?.from !== undefined) conditions.push(gte(growthDiaryAuditLogs.createdAt, new Date(range.from)));
  if (range?.to !== undefined) conditions.push(lte(growthDiaryAuditLogs.createdAt, new Date(range.to)));
  return db.select({ id: growthDiaryAuditLogs.id, action: growthDiaryAuditLogs.action, targetId: growthDiaryAuditLogs.targetId, createdAt: growthDiaryAuditLogs.createdAt })
    .from(growthDiaryAuditLogs)
    .where(and(...conditions))
    .orderBy(desc(growthDiaryAuditLogs.createdAt)).limit(50);
}

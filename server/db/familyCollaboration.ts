import { and, asc, desc, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { randomBytes } from "node:crypto";
import {
  growthDiaries,
  growthDiaryAuditLogs,
  growthDiaryInvites,
  growthDiaryMembers,
  growthEventComments,
  growthEvents,
  users,
} from "../../drizzle/schema";
import { hashShareToken } from "../shareAccess";

type DbClient = MySql2Database<Record<string, unknown>>;
export type DiaryMemberRole = "editor" | "commenter";
type AuditAction = "invite_created" | "invite_accepted" | "member_role_updated" | "member_removed" | "comment_created";

async function writeDiaryAudit(db: DbClient, diaryId: number, actorUserId: number, action: AuditAction, targetType: string, targetId?: number, metadata?: Record<string, unknown>) {
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
  const event = await db.select({ diaryId: growthEvents.diaryId }).from(growthEvents).where(eq(growthEvents.id, eventId)).limit(1);
  if (!event[0]) throw new Error("找不到這筆成長事件。");
  const owner = await db.select({ id: growthDiaries.id }).from(growthDiaries)
    .where(and(eq(growthDiaries.id, event[0].diaryId), eq(growthDiaries.userId, userId))).limit(1);
  if (owner[0]) return { diaryId: event[0].diaryId, role: "owner" as const };
  const member = await db.select().from(growthDiaryMembers)
    .where(and(eq(growthDiaryMembers.diaryId, event[0].diaryId), eq(growthDiaryMembers.userId, userId))).limit(1);
  if (!member[0]) throw new Error("你沒有檢視或註解這段成長史的權限。");
  return { diaryId: event[0].diaryId, role: member[0].role };
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
  const access = await getEventAccess(db, userId, eventId);
  await db.insert(growthEventComments).values({ eventId, authorUserId: userId, body: body.trim() });
  const comment = await db.select().from(growthEventComments).where(eq(growthEventComments.eventId, eventId)).orderBy(desc(growthEventComments.id)).limit(1);
  if (!comment[0]) throw new Error("無法新增註解。");
  await writeDiaryAudit(db, access.diaryId, userId, "comment_created", "comment", comment[0].id, { eventId });
  return comment[0];
}

export async function getEventCommentsForUser(db: DbClient, userId: number, eventId: number) {
  await getEventAccess(db, userId, eventId);
  return db.select({ id: growthEventComments.id, body: growthEventComments.body, createdAt: growthEventComments.createdAt, authorName: users.name })
    .from(growthEventComments).innerJoin(users, eq(growthEventComments.authorUserId, users.id))
    .where(eq(growthEventComments.eventId, eventId)).orderBy(asc(growthEventComments.createdAt));
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

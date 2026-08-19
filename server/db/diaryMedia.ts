import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthDiaries, growthEventMedia } from "../../drizzle/schema";
import { safeMediaName } from "../diaryHelpers";
import { storagePut } from "../storage";

type DbClient = MySql2Database<Record<string, unknown>>;
type AssertEventWriteAccess = (eventId: number, userId: number) => Promise<unknown>;
type MediaUpload = { userId: number; eventId: number; fileName: string; mimeType: string; base64: string; caption?: string };

export async function uploadDiaryEventMedia(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, input: MediaUpload) {
  await assertEventWriteAccess(input.eventId, input.userId);
  const bytes = Buffer.from(input.base64, "base64");
  if (bytes.byteLength > 4 * 1024 * 1024) throw new Error("圖片檔案不可超過 4MB。");
  const fileName = safeMediaName(input.fileName);
  const stored = await storagePut(`growth-diary/${input.userId}/event-${input.eventId}/${fileName}`, bytes, input.mimeType);
  const existingMedia = await db.select({ count: growthEventMedia.id }).from(growthEventMedia).where(eq(growthEventMedia.eventId, input.eventId));
  await db.insert(growthEventMedia).values({ eventId: input.eventId, storageKey: stored.key, url: stored.url, fileName, mimeType: input.mimeType, caption: input.caption?.trim() || null, sortOrder: existingMedia.length });
  return stored;
}

export async function deleteDiaryEventMediaForUser(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, userId: number, mediaId: number) {
  const media = await db.select({ id: growthEventMedia.id, eventId: growthEventMedia.eventId }).from(growthEventMedia).where(eq(growthEventMedia.id, mediaId)).limit(1);
  if (!media[0]) throw new Error("找不到這張圖片，或你沒有刪除權限。");
  await assertEventWriteAccess(media[0].eventId, userId);
  await db.delete(growthEventMedia).where(eq(growthEventMedia.id, mediaId));
  return { id: mediaId };
}

export async function updateDiaryEventMediaForUser(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, userId: number, mediaId: number, caption: string | null) {
  const media = await db.select({ id: growthEventMedia.id, eventId: growthEventMedia.eventId }).from(growthEventMedia).where(eq(growthEventMedia.id, mediaId)).limit(1);
  if (!media[0]) throw new Error("找不到這張圖片，或你沒有編輯權限。");
  await assertEventWriteAccess(media[0].eventId, userId);
  const nextCaption = caption?.trim() || null;
  await db.update(growthEventMedia).set({ caption: nextCaption }).where(eq(growthEventMedia.id, mediaId));
  return { id: mediaId, caption: nextCaption };
}

export async function reorderDiaryEventMediaForUser(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, userId: number, eventId: number, mediaIds: number[]) {
  await assertEventWriteAccess(eventId, userId);
  const media = await db.select({ id: growthEventMedia.id }).from(growthEventMedia).where(eq(growthEventMedia.eventId, eventId));
  if (media.length !== mediaIds.length || new Set(mediaIds).size !== mediaIds.length || media.some((item) => !mediaIds.includes(item.id))) throw new Error("圖片排序內容不完整，請重新整理後再試。");
  for (let sortOrder = 0; sortOrder < mediaIds.length; sortOrder += 1) await db.update(growthEventMedia).set({ sortOrder }).where(eq(growthEventMedia.id, mediaIds[sortOrder]!));
  return { eventId, mediaIds };
}

export async function uploadDiaryCoverMedia(db: DbClient, diaryId: number, input: { userId: number; fileName: string; mimeType: string; base64: string }) {
  const bytes = Buffer.from(input.base64, "base64");
  if (bytes.byteLength > 4 * 1024 * 1024) throw new Error("封面圖片不可超過 4MB。");
  const fileName = safeMediaName(input.fileName);
  const stored = await storagePut(`growth-diary/${input.userId}/cover/${Date.now()}-${fileName}`, bytes, input.mimeType);
  await db.update(growthDiaries).set({ publicCoverStorageKey: stored.key, publicCoverUrl: stored.url }).where(eq(growthDiaries.id, diaryId));
  return stored;
}

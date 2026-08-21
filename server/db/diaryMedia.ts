import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthDiaries, growthEventMedia } from "../../drizzle/schema";
import { safeMediaName } from "../diaryHelpers";
import { storagePut } from "../storage";

type DbClient = MySql2Database<Record<string, unknown>>;
type AssertEventWriteAccess = (eventId: number, userId: number) => Promise<{ access: { role: "owner" | "editor" | "commenter" } }>;
type MediaUpload = { userId: number; eventId: number; fileName: string; mimeType: string; base64: string; caption?: string; mediaKind?: "image" | "live_motion" };

export async function uploadDiaryEventMedia(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, input: MediaUpload) {
  await assertEventWriteAccess(input.eventId, input.userId);
  const bytes = Buffer.from(input.base64, "base64");
  if (bytes.byteLength > 4 * 1024 * 1024) throw new Error(input.mediaKind === "live_motion" ? "Live Photo 動態片段不可超過 4MB。" : "圖片檔案不可超過 4MB。");
  const fileName = safeMediaName(input.fileName);
  const stored = await storagePut(`growth-diary/${input.userId}/event-${input.eventId}/${input.mediaKind === "live_motion" ? "live-motion-" : ""}${fileName}`, bytes, input.mimeType);
  const existingMedia = await db.select({ count: growthEventMedia.id }).from(growthEventMedia).where(eq(growthEventMedia.eventId, input.eventId));
  await db.insert(growthEventMedia).values({ eventId: input.eventId, storageKey: stored.key, url: stored.url, fileName, mimeType: input.mimeType, mediaKind: input.mediaKind ?? "image", caption: input.caption?.trim() || null, sortOrder: existingMedia.length });
  return stored;
}

export async function uploadShareSafeDiaryEventMedia(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, input: { userId: number; mediaId: number; fileName: string; mimeType: string; base64: string }) {
  const media = await db.select({ id: growthEventMedia.id, eventId: growthEventMedia.eventId, mediaKind: growthEventMedia.mediaKind }).from(growthEventMedia).where(eq(growthEventMedia.id, input.mediaId)).limit(1);
  if (!media[0] || media[0].mediaKind !== "image") throw new Error("找不到可建立去識別化副本的事件圖片。" );
  const access = await assertEventWriteAccess(media[0].eventId, input.userId);
  if (access.access.role !== "owner") throw new Error("只有日記擁有者能建立分享用去識別化圖片。" );
  const bytes = Buffer.from(input.base64, "base64");
  if (!bytes.byteLength || bytes.byteLength > 4 * 1024 * 1024) throw new Error("去識別化圖片不可超過 4MB。" );
  const fileName = safeMediaName(input.fileName);
  const stored = await storagePut(`growth-diary/${input.userId}/event-${media[0].eventId}/share-safe-${input.mediaId}-${fileName}`, bytes, input.mimeType);
  await db.update(growthEventMedia).set({
    shareSafeStorageKey: stored.key,
    shareSafeUrl: stored.url,
    shareSafeFileName: fileName,
    shareSafeMimeType: input.mimeType,
    shareSafeEnabled: true,
  }).where(eq(growthEventMedia.id, input.mediaId));
  return { id: input.mediaId, ...stored };
}

export async function clearShareSafeDiaryEventMedia(db: DbClient, assertEventWriteAccess: AssertEventWriteAccess, userId: number, mediaId: number) {
  const media = await db.select({ id: growthEventMedia.id, eventId: growthEventMedia.eventId }).from(growthEventMedia).where(eq(growthEventMedia.id, mediaId)).limit(1);
  if (!media[0]) throw new Error("找不到去識別化圖片設定。" );
  const access = await assertEventWriteAccess(media[0].eventId, userId);
  if (access.access.role !== "owner") throw new Error("只有日記擁有者能調整分享用去識別化圖片。" );
  // Keep the share-safe gate enabled. With no derivative URL the public
  // projection hides this media instead of falling back to the private source.
  await db.update(growthEventMedia).set({ shareSafeStorageKey: null, shareSafeUrl: null, shareSafeFileName: null, shareSafeMimeType: null, shareSafeEnabled: true }).where(eq(growthEventMedia.id, mediaId));
  return { id: mediaId, shareSafeEnabled: true, hasShareSafeDerivative: false };
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

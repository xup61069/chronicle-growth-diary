import { and, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthDiaries, growthEventMedia, growthEvents, growthJourneyDetails } from "../../drizzle/schema";

type DbClient = MySql2Database<Record<string, unknown>>;

export type JourneyDetailsInput = {
  startedAt: number;
  endedAt: number;
  coverMediaId: number | null;
};

async function requireOwnedEvent(db: DbClient, userId: number, eventId: number) {
  const event = await db.select({ id: growthEvents.id, shareScope: growthEvents.shareScope })
    .from(growthEvents)
    .innerJoin(growthDiaries, eq(growthEvents.diaryId, growthDiaries.id))
    .where(and(eq(growthEvents.id, eventId), eq(growthDiaries.userId, userId)))
    .limit(1);
  if (!event[0]) throw new Error("找不到這段私人旅程，或你沒有編輯權限。");
  if (event[0].shareScope !== "private") throw new Error("旅程詳細資料只可保留在 private 事件中。");
}

export async function saveJourneyDetailsForOwner(db: DbClient, userId: number, eventId: number, input: JourneyDetailsInput) {
  if (!Number.isSafeInteger(input.startedAt) || !Number.isSafeInteger(input.endedAt) || input.startedAt > input.endedAt) {
    throw new Error("旅程起訖日期無效。");
  }
  await requireOwnedEvent(db, userId, eventId);
  if (input.coverMediaId !== null) {
    const cover = await db.select({ id: growthEventMedia.id, mediaKind: growthEventMedia.mediaKind })
      .from(growthEventMedia)
      .where(and(eq(growthEventMedia.id, input.coverMediaId), eq(growthEventMedia.eventId, eventId)))
      .limit(1);
    if (!cover[0] || cover[0].mediaKind !== "image") throw new Error("旅程封面必須是這段事件已上傳的靜態圖片。");
  }
  await db.insert(growthJourneyDetails).values({ eventId, ...input }).onDuplicateKeyUpdate({
    set: { startedAt: input.startedAt, endedAt: input.endedAt, coverMediaId: input.coverMediaId },
  });
  const detail = await db.select().from(growthJourneyDetails).where(eq(growthJourneyDetails.eventId, eventId)).limit(1);
  if (!detail[0]) throw new Error("無法保存旅程詳細資料。");
  return detail[0];
}

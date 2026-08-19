import { eq, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthDiaries, growthShareAccessLogs } from "../../drizzle/schema";
import { getEnrichedDiaryEvents } from "./diaryRead";
import { deriveLifePhases, getInvalidLifePhaseBoundary } from "../lifePhases";
import {
  hasShareAccess,
  hashSharePassword,
  hashShareToken,
  isShareExpired,
  makeShareSlug,
  makeShareToken,
  verifySharePassword,
} from "../shareAccess";

type DbClient = MySql2Database<Record<string, unknown>>;
type Diary = typeof growthDiaries.$inferSelect;

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

function makeLifePhaseSnapshot(diary: Diary, events: Awaited<ReturnType<typeof getEnrichedDiaryEvents>>) {
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

export async function persistDiarySharing(db: DbClient, diary: Diary, input: DiarySharingInput) {
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

  const sharePasswordHash = input.clearSharePassword
    ? null
    : input.sharePassword
      ? hashSharePassword(input.sharePassword)
      : diary.sharePasswordHash;
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

  return {
    mode: input.shareMode,
    slug: shareSlug,
    shareToken,
    hasPassword: Boolean(input.shareMode !== "private" && sharePasswordHash),
    expiresAt: input.shareMode === "private" ? null : shareExpiresAt,
  };
}

export async function readSharedDiary(db: DbClient, slug: string, token?: string | null, password?: string | null) {
  const matching = await db.select().from(growthDiaries).where(eq(growthDiaries.shareSlug, slug)).limit(1);
  const diary = matching[0];
  if (!diary) return { status: "not_found" as const };
  if (isShareExpired(diary.shareExpiresAt)) return { status: "expired" as const };
  if (!hasShareAccess({ mode: diary.shareMode, storedTokenHash: diary.shareTokenHash, providedToken: token })) return { status: "locked" as const };
  if (diary.sharePasswordHash && !password) return { status: "password_required" as const };
  if (diary.sharePasswordHash && !verifySharePassword(password ?? "", diary.sharePasswordHash)) return { status: "password_invalid" as const };

  const events = await getEnrichedDiaryEvents(db, diary.id, true);
  await db.update(growthDiaries).set({
    shareAccessCount: sql`${growthDiaries.shareAccessCount} + 1`,
    lastSharedAt: new Date(),
  }).where(eq(growthDiaries.id, diary.id));
  await db.insert(growthShareAccessLogs).values({
    diaryId: diary.id,
    channel: diary.shareMode === "link" ? "link" : "public",
  });

  return {
    status: "ok" as const,
    diary: {
      title: diary.title,
      subtitle: diary.subtitle,
      shareMode: diary.shareMode,
      publicCoverUrl: diary.publicCoverUrl,
      publicCoverTitle: diary.publicCoverTitle,
      publicStoryLayout: diary.publicStoryLayout,
    },
    events,
    lifePhases: makeLifePhaseSnapshot(diary, events),
  };
}

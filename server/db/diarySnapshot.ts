import { asc, desc, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthDiaries, growthPhaseReflections, growthShareAccessLogs, growthTags } from "../../drizzle/schema";
import { getEnrichedDiaryEvents } from "./diaryRead";
import { deriveLifePhases } from "../lifePhases";

type DbClient = MySql2Database<Record<string, unknown>>;
type Diary = typeof growthDiaries.$inferSelect;
export type DiarySnapshotAccessRole = "owner" | "editor" | "commenter";

export async function buildDiarySnapshotForDiary(db: DbClient, diary: Diary, accessRole: DiarySnapshotAccessRole) {
  const tags = await db.select().from(growthTags).where(eq(growthTags.userId, diary.userId)).orderBy(asc(growthTags.name));
  const events = await getEnrichedDiaryEvents(db, diary.id);
  const reflections = await db.select().from(growthPhaseReflections).where(eq(growthPhaseReflections.diaryId, diary.id));
  const annualReflections = reflections
    .filter((reflection) => /^annual-\d{4}$/.test(reflection.phaseKey))
    .map((reflection) => ({ ...reflection, year: Number(reflection.phaseKey.slice("annual-".length)) }));
  const recentAccesses = await db.select().from(growthShareAccessLogs).where(eq(growthShareAccessLogs.diaryId, diary.id)).orderBy(desc(growthShareAccessLogs.accessedAt)).limit(6);

  return {
    diary,
    accessRole,
    tags,
    events,
    lifePhases: deriveLifePhases(events, {
      birthYear: diary.birthYear,
      educationStartYear: diary.educationStartYear,
      careerStartYear: diary.careerStartYear,
      childhoodStartYear: diary.childhoodStartYear,
      childhoodEndYear: diary.childhoodEndYear,
      educationEndYear: diary.educationEndYear,
      careerEndYear: diary.careerEndYear,
    }),
    sharing: {
      mode: diary.shareMode,
      slug: diary.shareSlug,
      hasPrivateLink: Boolean(diary.shareTokenHash),
      hasPassword: Boolean(diary.sharePasswordHash),
      expiresAt: diary.shareExpiresAt,
      accessCount: diary.shareAccessCount,
      lastSharedAt: diary.lastSharedAt,
      recentAccesses,
    },
    reflections: reflections.filter((reflection) => !/^annual-\d{4}$/.test(reflection.phaseKey)),
    annualReflections,
  };
}

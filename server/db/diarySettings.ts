import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthDiaries } from "../../drizzle/schema";
import { getInvalidLifePhaseBoundary } from "../lifePhases";

type DbClient = MySql2Database<Record<string, unknown>>;
type Diary = typeof growthDiaries.$inferSelect;

export type DiaryPhaseBoundariesInput = Partial<Pick<Diary, "childhoodStartYear" | "childhoodEndYear" | "educationStartYear" | "educationEndYear" | "careerStartYear" | "careerEndYear">>;
export type DiaryProfileInput = { title: string; subtitle?: string | null };

export async function updateDiaryPhaseBoundariesForDiary(db: DbClient, diary: Diary, input: DiaryPhaseBoundariesInput) {
  const invalidBoundary = getInvalidLifePhaseBoundary({ ...diary, ...input });
  if (invalidBoundary) throw new Error(`${invalidBoundary.label}階段的結束年份不能早於開始年份。`);
  await db.update(growthDiaries).set(input).where(eq(growthDiaries.id, diary.id));
  return input;
}

export async function updateDiaryProfileForDiary(db: DbClient, diaryId: number, input: DiaryProfileInput) {
  const title = input.title.trim();
  const subtitle = input.subtitle?.trim() || null;
  await db.update(growthDiaries).set({ title, subtitle }).where(eq(growthDiaries.id, diaryId));
  return { title, subtitle };
}

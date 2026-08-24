import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  growthAnnualSurveyAnswers,
  growthAnnualSurveyQuestions,
  growthAnnualSurveySets,
  users,
} from "../../drizzle/schema";

type DbClient = MySql2Database<Record<string, unknown>>;
export type AnnualSurveyAccess = {
  diaryId: number;
  userId: number;
  role: "owner" | "editor" | "commenter";
};
export type AnnualSurveySetInput = {
  title?: string;
  targetMonth?: number;
  targetDay?: number;
  questions?: string[];
};

export const DEFAULT_ANNUAL_SURVEY_QUESTIONS = [
  "今年最喜歡的一本書、影片或故事是什麼？",
  "今年最想記住的一件小事是什麼？",
  "今年學會或練習了什麼？",
  "今年最想去的地方是哪裡？",
  "今年最感謝誰或什麼？",
  "今年最常做的一件事是什麼？",
  "今年有哪個時刻讓你覺得勇敢？",
  "今年最喜歡的一張照片或一段回憶是什麼？",
  "明年想嘗試的一件事是什麼？",
  "想留給明年自己的哪一句話？",
] as const;

function normalizedQuestions(input?: string[]) {
  const questions = (
    input?.length ? input : [...DEFAULT_ANNUAL_SURVEY_QUESTIONS]
  ).map(question => question.trim());
  if (questions.length < 1 || questions.length > 20)
    throw new Error("年度問卷需要 1 至 20 題。");
  if (questions.some(question => !question || question.length > 240))
    throw new Error("年度問卷題目必須介於 1 至 240 個字元。");
  if (new Set(questions).size !== questions.length)
    throw new Error("年度問卷題目不能重複。");
  return questions;
}

function normalizeSetInput(input: AnnualSurveySetInput) {
  const title = (input.title ?? "家庭年度問卷").trim();
  const targetMonth = input.targetMonth ?? 12;
  const targetDay = input.targetDay ?? 31;
  if (!title || title.length > 120)
    throw new Error("年度問卷標題必須介於 1 至 120 個字元。");
  if (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12)
    throw new Error("年度問卷月份無效。");
  if (!Number.isInteger(targetDay) || targetDay < 1 || targetDay > 31)
    throw new Error("年度問卷日期無效。");
  const calendarCheck = new Date(Date.UTC(2024, targetMonth - 1, targetDay));
  if (
    calendarCheck.getUTCMonth() !== targetMonth - 1 ||
    calendarCheck.getUTCDate() !== targetDay
  )
    throw new Error("年度問卷日期無效。");
  return {
    title,
    targetMonth,
    targetDay,
    questions: normalizedQuestions(input.questions),
  };
}

export async function createAnnualSurveyForDiary(
  db: DbClient,
  diaryId: number,
  userId: number,
  input: AnnualSurveySetInput = {}
) {
  const normalized = normalizeSetInput(input);
  return db.transaction(async tx => {
    await tx.insert(growthAnnualSurveySets).values({
      diaryId,
      createdByUserId: userId,
      title: normalized.title,
      targetMonth: normalized.targetMonth,
      targetDay: normalized.targetDay,
      remindersEnabled: false,
    });
    const created = await tx
      .select({ id: growthAnnualSurveySets.id })
      .from(growthAnnualSurveySets)
      .where(
        and(
          eq(growthAnnualSurveySets.diaryId, diaryId),
          eq(growthAnnualSurveySets.createdByUserId, userId)
        )
      )
      .orderBy(desc(growthAnnualSurveySets.id))
      .limit(1);
    if (!created[0]) throw new Error("無法建立家庭年度問卷。");
    await tx.insert(growthAnnualSurveyQuestions).values(
      normalized.questions.map((prompt, position) => ({
        surveyId: created[0].id,
        prompt,
        position,
      }))
    );
    return { id: created[0].id, remindersEnabled: false };
  });
}

/** Diary members can read family answers, but this projection is never part of public/link/AI/event queries. */
export async function listAnnualSurveysForDiary(db: DbClient, diaryId: number) {
  const surveys = await db
    .select({
      id: growthAnnualSurveySets.id,
      title: growthAnnualSurveySets.title,
      targetMonth: growthAnnualSurveySets.targetMonth,
      targetDay: growthAnnualSurveySets.targetDay,
      remindersEnabled: growthAnnualSurveySets.remindersEnabled,
      updatedAt: growthAnnualSurveySets.updatedAt,
    })
    .from(growthAnnualSurveySets)
    .where(eq(growthAnnualSurveySets.diaryId, diaryId))
    .orderBy(asc(growthAnnualSurveySets.id));
  if (!surveys.length) return [];
  const surveyIds = surveys.map(survey => survey.id);
  const questions = await db
    .select({
      id: growthAnnualSurveyQuestions.id,
      surveyId: growthAnnualSurveyQuestions.surveyId,
      prompt: growthAnnualSurveyQuestions.prompt,
      position: growthAnnualSurveyQuestions.position,
    })
    .from(growthAnnualSurveyQuestions)
    .where(inArray(growthAnnualSurveyQuestions.surveyId, surveyIds))
    .orderBy(asc(growthAnnualSurveyQuestions.position));
  const answers = await db
    .select({
      id: growthAnnualSurveyAnswers.id,
      surveyId: growthAnnualSurveyAnswers.surveyId,
      questionId: growthAnnualSurveyAnswers.questionId,
      authorUserId: growthAnnualSurveyAnswers.authorUserId,
      authorName: users.name,
      responseSlot: growthAnnualSurveyAnswers.responseSlot,
      year: growthAnnualSurveyAnswers.year,
      body: growthAnnualSurveyAnswers.body,
      updatedAt: growthAnnualSurveyAnswers.updatedAt,
    })
    .from(growthAnnualSurveyAnswers)
    .innerJoin(users, eq(growthAnnualSurveyAnswers.authorUserId, users.id))
    .where(inArray(growthAnnualSurveyAnswers.surveyId, surveyIds))
    .orderBy(
      desc(growthAnnualSurveyAnswers.year),
      asc(growthAnnualSurveyAnswers.questionId),
      asc(growthAnnualSurveyAnswers.authorUserId)
    );
  return surveys.map(survey => ({
    ...survey,
    questions: questions.filter(question => question.surveyId === survey.id),
    answers: answers.filter(answer => answer.surveyId === survey.id),
  }));
}

export async function saveAnnualSurveyAnswerForDiary(
  db: DbClient,
  access: AnnualSurveyAccess,
  input: { surveyId: number; questionId: number; year: number; body: string }
) {
  const body = input.body.trim();
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2200)
    throw new Error("年度問卷年份無效。");
  if (!body || body.length > 4000)
    throw new Error("年度問卷回答必須介於 1 至 4000 個字元。");
  const survey = await db
    .select({ id: growthAnnualSurveySets.id })
    .from(growthAnnualSurveySets)
    .where(
      and(
        eq(growthAnnualSurveySets.id, input.surveyId),
        eq(growthAnnualSurveySets.diaryId, access.diaryId)
      )
    )
    .limit(1);
  if (!survey[0]) throw new Error("找不到這份家庭年度問卷。");
  const question = await db
    .select({ id: growthAnnualSurveyQuestions.id })
    .from(growthAnnualSurveyQuestions)
    .where(
      and(
        eq(growthAnnualSurveyQuestions.id, input.questionId),
        eq(growthAnnualSurveyQuestions.surveyId, input.surveyId)
      )
    )
    .limit(1);
  if (!question[0]) throw new Error("這個題目不屬於目前年度問卷。");
  await db
    .insert(growthAnnualSurveyAnswers)
    .values({
      surveyId: input.surveyId,
      questionId: input.questionId,
      authorUserId: access.userId,
      responseSlot: 0,
      year: input.year,
      body,
    })
    .onDuplicateKeyUpdate({ set: { body } });
  return {
    surveyId: input.surveyId,
    questionId: input.questionId,
    year: input.year,
    body,
  };
}

import { and, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { growthDiaries, growthPhaseReflections } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { getEnrichedDiaryEvents } from "./diaryRead";
import { deriveLifePhases } from "../lifePhases";

type DbClient = MySql2Database<Record<string, unknown>>;
type Diary = typeof growthDiaries.$inferSelect;
export type ReflectionPhaseKey = "childhood" | "education" | "career";
export type PhaseReflectionInput = {
  phaseKey: ReflectionPhaseKey;
  recap: string;
  reflection: string;
};

const MODEL_ID = "claude-haiku-4-5";

export function assertAiEnabled(aiEnabled: boolean) {
  if (!aiEnabled) throw new Error("你已關閉 AI 回顧。重新啟用後才可根據事件生成文字。 ");
}

function getLifePhases(diary: Diary, events: Awaited<ReturnType<typeof getEnrichedDiaryEvents>>) {
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

function makeSource(events: Awaited<ReturnType<typeof getEnrichedDiaryEvents>>, includeYear: boolean, limit: number) {
  return events.slice(0, limit).map((event, index) => [
    `${index + 1}. ${includeYear ? `${new Date(event.occurredAt).getFullYear()}｜` : ""}${event.title}`,
    event.body.slice(0, 550),
    event.tags.length ? `標籤：${event.tags.map((tag) => tag.name).join("、")}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");
}

function parseReflection(content: unknown, fallbackQuestion: string, errorMessage: string) {
  const text = typeof content === "string" ? content.trim() : "";
  const marked = text.match(/===RECAP===\s*([\s\S]*?)\s*===REFLECTION===\s*([\s\S]*)/i);
  const labelled = text.match(/(?:成長回顧|回顧)\s*[:：]\s*([\s\S]*?)(?:反思|自我反思)\s*[:：]\s*([\s\S]*)/i);
  const recap = marked?.[1]?.trim() || labelled?.[1]?.trim() || text;
  const reflection = marked?.[2]?.trim() || labelled?.[2]?.trim() || (text ? fallbackQuestion : "");
  if (!recap || !reflection) throw new Error(errorMessage);
  return { recap, reflection };
}

async function saveReflection(db: DbClient, diaryId: number, phaseKey: string, recap: string, reflection: string, model: string) {
  await db.insert(growthPhaseReflections).values({ diaryId, phaseKey, recap, reflection, model })
    .onDuplicateKeyUpdate({ set: { recap, reflection, model } });
}

export async function generatePhaseReflectionForDiary(db: DbClient, diary: Diary, phaseKey: ReflectionPhaseKey) {
  assertAiEnabled(diary.aiEnabled);
  const events = await getEnrichedDiaryEvents(db, diary.id);
  const phase = getLifePhases(diary, events).find((item) => item.key === phaseKey);
  if (!phase?.events.length) throw new Error("這個人生階段還沒有足夠事件可供回顧。");

  const result = await invokeLLM({
    model: MODEL_ID,
    maxTokens: 1200,
    messages: [
      { role: "system", content: "你是溫和、精準的個人成長檔案編輯。只能依據提供的事件寫作，不要診斷、推測敏感背景或下結論。以繁體中文輸出具體、尊重使用者主體性的文字。" },
      { role: "user", content: `請根據「${phase.label}」階段的事件，產生兩部分：一段 120–220 字的成長回顧，以及一段 80–160 字、以開放問題與覺察為主的反思。請嚴格依照以下格式輸出，除了兩個標記與內容外不要加入任何文字：\n===RECAP===\n回顧文字\n===REFLECTION===\n反思文字\n\n事件資料：\n${makeSource(phase.events, true, 30)}` },
    ],
  });
  const { recap, reflection } = parseReflection(
    result.choices[0]?.message.content,
    "回看這段經驗時，哪些努力、選擇或感受最值得你繼續記下來？",
    "AI 回顧格式不完整，請稍後再試。",
  );
  const model = result.model || MODEL_ID;
  await saveReflection(db, diary.id, phaseKey, recap, reflection, model);
  return { phaseKey, recap, reflection, model };
}

export async function generateAnnualReflectionForDiary(db: DbClient, diary: Diary, year: number) {
  assertAiEnabled(diary.aiEnabled);
  const events = (await getEnrichedDiaryEvents(db, diary.id)).filter(
    (event) => new Date(event.occurredAt).getFullYear() === year && event.shareScope === "private",
  );
  if (!events.length) throw new Error("這一年還沒有事件可供回顧。請先寫下至少一段記憶。");

  const result = await invokeLLM({
    model: MODEL_ID,
    maxTokens: 1200,
    messages: [
      { role: "system", content: "你是溫和、精準的個人成長檔案編輯。只能依據提供的年度事件寫作，不要診斷、推測敏感背景或下結論。以繁體中文輸出具體、尊重使用者主體性的文字。" },
      { role: "user", content: `請根據 ${year} 年的事件，產生兩部分：一段 140–240 字的年度回顧，以及一段 80–160 字、以開放問題與覺察為主的來年提問。請嚴格依照以下格式輸出，除了兩個標記與內容外不要加入任何文字：\n===RECAP===\n回顧文字\n===REFLECTION===\n提問文字\n\n僅限本年度事件資料：\n${makeSource(events, false, 40)}` },
    ],
  });
  const { recap, reflection } = parseReflection(
    result.choices[0]?.message.content,
    "回看這一年時，哪些選擇、關係或感受值得帶進下一段時間？",
    "AI 年度回顧格式不完整，請稍後再試。",
  );
  const phaseKey = `annual-${year}`;
  const model = result.model || MODEL_ID;
  await saveReflection(db, diary.id, phaseKey, recap, reflection, model);
  return { year, recap, reflection, model };
}

export async function updatePhaseReflectionForDiary(db: DbClient, diaryId: number, input: PhaseReflectionInput) {
  const existing = await db.select({ id: growthPhaseReflections.id }).from(growthPhaseReflections)
    .where(and(eq(growthPhaseReflections.diaryId, diaryId), eq(growthPhaseReflections.phaseKey, input.phaseKey))).limit(1);
  if (!existing[0]) throw new Error("請先生成一段 AI 回顧後再進行手動調整。");
  const recap = input.recap.trim();
  const reflection = input.reflection.trim();
  await db.update(growthPhaseReflections).set({ recap, reflection, model: "manual-edit" }).where(eq(growthPhaseReflections.id, existing[0].id));
  return { phaseKey: input.phaseKey, recap, reflection, model: "manual-edit" };
}

export async function setDiaryAiEnabled(db: DbClient, diaryId: number, aiEnabled: boolean) {
  await db.update(growthDiaries).set({ aiEnabled }).where(eq(growthDiaries.id, diaryId));
  return { aiEnabled };
}

export async function deletePhaseReflectionForDiary(db: DbClient, diaryId: number, phaseKey: ReflectionPhaseKey) {
  await db.delete(growthPhaseReflections).where(and(eq(growthPhaseReflections.diaryId, diaryId), eq(growthPhaseReflections.phaseKey, phaseKey)));
  return { phaseKey };
}

export async function deleteAnnualReflectionForDiary(db: DbClient, diaryId: number, year: number) {
  await db.delete(growthPhaseReflections).where(and(eq(growthPhaseReflections.diaryId, diaryId), eq(growthPhaseReflections.phaseKey, `annual-${year}`)));
  return { year };
}

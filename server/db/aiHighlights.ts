import type { MySql2Database } from "drizzle-orm/mysql2";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { growthEvents } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { getEnrichedDiaryEvents } from "./diaryRead";
import { assertAiEnabled } from "./aiReflections";
import { writeEventRevisionSnapshot } from "./diaryEvents";

type DbClient = MySql2Database<Record<string, unknown>>;
type Diary = { id: number; aiEnabled: boolean };
type EventWriteAccess = { id: number; diaryId: number; access: { diary: { id: number; userId: number } } };
type AssertEventWriteAccess = (eventId: number, userId: number) => Promise<EventWriteAccess>;

export type HighlightSuggestion = {
  eventId: number;
  title: string;
  reason: string;
  confidence: "high" | "medium";
  model: string;
};

const MODEL_ID = "gpt-5-mini";
const candidateSchema = z.object({
  eventId: z.number().int().positive(),
  reason: z.string().trim().min(8).max(120),
  confidence: z.enum(["high", "medium"]),
});
const resultSchema = z.object({ candidates: z.array(candidateSchema).max(8) });

function makeSource(events: Awaited<ReturnType<typeof getEnrichedDiaryEvents>>) {
  return events.map((event) => [
    `ID=${event.id}｜${new Date(event.occurredAt).getFullYear()}｜${event.title}`,
    event.body.slice(0, 320),
    event.tags.length ? `標籤：${event.tags.map((tag) => tag.name).join("、")}` : "",
    `類型：${event.eventType}；軌道：${event.track}`,
  ].filter(Boolean).join("\n")).join("\n\n");
}

export async function suggestHighlightsForDiary(db: DbClient, diary: Diary) {
  assertAiEnabled(diary.aiEnabled);
  const events = (await getEnrichedDiaryEvents(db, diary.id))
    .filter((event) => event.shareScope === "private" && event.milestoneType !== "highlight")
    .slice(0, 80);
  if (!events.length) throw new Error("還沒有可供評估的 private 事件，或它們都已標記為精選。");

  const eventById = new Map(events.map((event) => [event.id, event]));
  const result = await invokeLLM({
    model: MODEL_ID,
    maxTokens: 900,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "chronicle_highlight_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            candidates: {
              type: "array",
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  eventId: { type: "integer" },
                  reason: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium"] },
                },
                required: ["eventId", "reason", "confidence"],
                additionalProperties: false,
              },
            },
          },
          required: ["candidates"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      { role: "system", content: "你是精準的個人成長檔案編輯。只能根據提供的 private 事件片段，建議最適合成為『精選』的少量事件。精選代表可支撐年度回顧、書冊或時間軸重點的具體記錄，不代表此人更有價值。不要診斷、推測敏感背景、評價人格或重寫事件。每個 reason 使用繁體中文，指出已提供的具體線索。只回傳 JSON。" },
      { role: "user", content: `請從以下事件選出 1–8 個候選。只能使用列出的 ID；若沒有足夠依據，回傳空 candidates。不要因為情緒強度、私人關係、地點或媒體存在而推測重要性。\n\n事件片段：\n${makeSource(events)}` },
    ],
  });
  const raw = result.choices[0]?.message.content;
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof raw === "string" ? raw : "");
  } catch {
    throw new Error("AI 精選建議格式不完整，請稍後再試。");
  }
  const validated = resultSchema.safeParse(parsed);
  if (!validated.success) throw new Error("AI 精選建議格式不完整，請稍後再試。");
  const seen = new Set<number>();
  const model = result.model || MODEL_ID;
  return validated.data.candidates.flatMap((candidate): HighlightSuggestion[] => {
    const event = eventById.get(candidate.eventId);
    if (!event || seen.has(candidate.eventId)) return [];
    seen.add(candidate.eventId);
    return [{ eventId: event.id, title: event.title, reason: candidate.reason, confidence: candidate.confidence, model }];
  });
}

export async function adoptHighlightSuggestionForDiary(db: DbClient, diary: Diary, userId: number, eventId: number, assertEventWriteAccess: AssertEventWriteAccess) {
  const event = await db.select({ id: growthEvents.id, milestoneType: growthEvents.milestoneType, milestoneWeight: growthEvents.milestoneWeight })
    .from(growthEvents)
    .where(and(eq(growthEvents.id, eventId), eq(growthEvents.diaryId, diary.id), eq(growthEvents.shareScope, "private")))
    .limit(1);
  if (!event[0]) throw new Error("找不到這筆 private 事件，或它不再可採用為精選。 ");
  if (event[0].milestoneType === "highlight") return { eventId, alreadyHighlighted: true, revisionVersion: null };

  await db.update(growthEvents).set({ milestoneType: "highlight", milestoneWeight: Math.max(event[0].milestoneWeight, 4) }).where(eq(growthEvents.id, eventId));
  const revision = await writeEventRevisionSnapshot(db, assertEventWriteAccess, userId, eventId, "update");
  return { eventId, alreadyHighlighted: false, revisionVersion: revision.version };
}

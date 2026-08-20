import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnrichedDiaryEvents: vi.fn(),
  invokeLLM: vi.fn(),
}));

vi.mock("./diaryRead", () => ({
  getEnrichedDiaryEvents: mocks.getEnrichedDiaryEvents,
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: mocks.invokeLLM,
}));

import { generateAnnualReflectionForDiary } from "./aiReflections";

function createDb() {
  const onDuplicateKeyUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn(() => ({ onDuplicateKeyUpdate }));
  const insert = vi.fn(() => ({ values }));
  return { db: { insert } as never, values };
}

const diary = {
  id: 9,
  aiEnabled: true,
} as never;

describe("AI reflection data access", () => {
  it("rejects a disabled diary before reading events or calling the model", async () => {
    const { db } = createDb();

    await expect(generateAnnualReflectionForDiary(db, { ...diary, aiEnabled: false }, 2025))
      .rejects.toThrow("你已關閉 AI 回顧");
    expect(mocks.getEnrichedDiaryEvents).not.toHaveBeenCalled();
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("sends only selected-year event fragments to the model and saves an annual reflection", async () => {
    const { db, values } = createDb();
    mocks.getEnrichedDiaryEvents.mockResolvedValueOnce([
      {
        id: 1,
        occurredAt: Date.UTC(2025, 4, 1),
        title: "本年度的突破",
        body: "只應交給年度回顧的片段",
        tags: [{ name: "學習" }],
        media: [],
        shareScope: "private",
      },
      {
        id: 3,
        occurredAt: Date.UTC(2025, 5, 1),
        title: "不應送出的公開事件",
        body: "公開範圍不應自動送給年度 AI。",
        tags: [],
        media: [],
        shareScope: "public",
      },
      {
        id: 4,
        occurredAt: Date.UTC(2025, 6, 1),
        title: "不應送出的連結事件",
        body: "連結分享範圍不應自動送給年度 AI。",
        tags: [],
        media: [],
        shareScope: "link",
      },
      {
        id: 2,
        occurredAt: Date.UTC(2024, 4, 1),
        title: "不應送出的舊事件",
        body: "這段文字不屬於指定年度",
        tags: [],
        media: [],
        shareScope: "private",
      },
    ]);
    mocks.invokeLLM.mockResolvedValueOnce({
      model: "claude-haiku-4-5",
      choices: [{ message: { content: "===RECAP===\n年度回顧\n===REFLECTION===\n來年提問" } }],
    });

    const result = await generateAnnualReflectionForDiary(db, diary, 2025);

    expect(result).toEqual({
      year: 2025,
      recap: "年度回顧",
      reflection: "來年提問",
      model: "claude-haiku-4-5",
    });
    const llmInput = mocks.invokeLLM.mock.calls[0]?.[0];
    const prompt = llmInput.messages[1].content as string;
    expect(prompt).toContain("本年度的突破");
    expect(prompt).not.toContain("不應送出的舊事件");
    expect(prompt).not.toContain("不應送出的公開事件");
    expect(prompt).not.toContain("不應送出的連結事件");
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      diaryId: 9,
      phaseKey: "annual-2025",
      recap: "年度回顧",
      reflection: "來年提問",
    }));
  });
});

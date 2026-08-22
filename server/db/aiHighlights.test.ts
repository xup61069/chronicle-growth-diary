import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnrichedDiaryEvents: vi.fn(),
  invokeLLM: vi.fn(),
}));

vi.mock("./diaryRead", () => ({ getEnrichedDiaryEvents: mocks.getEnrichedDiaryEvents }));
vi.mock("../_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import { suggestHighlightsForDiary } from "./aiHighlights";

const diary = { id: 9, aiEnabled: true } as never;

describe("AI highlight suggestions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fails closed before reading events or invoking the model when AI is disabled", async () => {
    await expect(suggestHighlightsForDiary({} as never, { ...diary, aiEnabled: false }))
      .rejects.toThrow("你已關閉 AI 回顧");
    expect(mocks.getEnrichedDiaryEvents).not.toHaveBeenCalled();
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("sends only private non-highlight fragments and returns only valid, unique event candidates", async () => {
    mocks.getEnrichedDiaryEvents.mockResolvedValueOnce([
      { id: 11, occurredAt: Date.UTC(2025, 4, 1), title: "完成作品集", body: "從草稿整理成一份可交付的版本。", tags: [{ name: "創作" }], shareScope: "private", milestoneType: "standard", eventType: "achievement", track: "career" },
      { id: 12, occurredAt: Date.UTC(2025, 5, 1), title: "既有精選", body: "不應再次送出。", tags: [], shareScope: "private", milestoneType: "highlight", eventType: "achievement", track: "career" },
      { id: 13, occurredAt: Date.UTC(2025, 6, 1), title: "公開事件", body: "不應送往私人 AI 候選。", tags: [], shareScope: "public", milestoneType: "standard", eventType: "memory", track: "life" },
      { id: 14, occurredAt: Date.UTC(2025, 7, 1), title: "連結事件", body: "不應送往私人 AI 候選。", tags: [], shareScope: "link", milestoneType: "standard", eventType: "memory", track: "life" },
    ]);
    mocks.invokeLLM.mockResolvedValueOnce({
      model: "gpt-5-mini",
      choices: [{ message: { content: JSON.stringify({ candidates: [
        { eventId: 11, reason: "完成可交付作品集，清楚呈現從整理到交付的成長轉折。", confidence: "high" },
        { eventId: 11, reason: "重複候選應被濾除。", confidence: "medium" },
        { eventId: 99, reason: "不存在的事件不應被採用。", confidence: "medium" },
      ] }) } }],
    });

    const result = await suggestHighlightsForDiary({} as never, diary);

    expect(result).toEqual([{ eventId: 11, title: "完成作品集", reason: "完成可交付作品集，清楚呈現從整理到交付的成長轉折。", confidence: "high", model: "gpt-5-mini" }]);
    const request = mocks.invokeLLM.mock.calls[0]?.[0];
    const prompt = request.messages[1].content as string;
    expect(prompt).toContain("ID=11");
    expect(prompt).not.toContain("既有精選");
    expect(prompt).not.toContain("公開事件");
    expect(prompt).not.toContain("連結事件");
    expect(request.response_format.json_schema.strict).toBe(true);
  });
});

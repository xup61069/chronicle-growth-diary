import { describe, expect, it } from "vitest";
import { appendWritingGuide, getLocalWritingGuides } from "./writingGuide";

describe("local writing guides", () => {
  it("offers a narrative-specific closing prompt without calling an external service", () => {
    const guides = getLocalWritingGuides("achievement");

    expect(guides.map((guide) => guide.key)).toEqual(["scene", "feeling", "achievement"]);
    expect(guides[2]?.template).toContain("為了走到這裡");
  });

  it("adds a guide below existing writing without overwriting the draft", () => {
    expect(appendWritingGuide("今天完成了作品集。\n", "我從這次經驗帶走的是……")).toBe("今天完成了作品集。\n\n我從這次經驗帶走的是……");
    expect(appendWritingGuide("", "我記得那一刻，最先映入眼簾的是……")).toBe("我記得那一刻，最先映入眼簾的是……");
  });
});

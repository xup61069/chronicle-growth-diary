import { describe, expect, it } from "vitest";
import { buildAnnualReview } from "./annualReview";

const events = [
  { id: 1, occurredAt: new Date(2024, 1, 1).getTime(), title: "完成作品", body: "整理一年的練習。", eventType: "achievement" as const, tags: [{ name: "作品" }] },
  { id: 2, occurredAt: new Date(2024, 8, 1).getTime(), title: "開始學習", body: "投入新的研究方法。", eventType: "learning" as const, tags: [{ name: "學習" }] },
  { id: 3, occurredAt: new Date(2023, 1, 1).getTime(), title: "舊記事", body: "前一年。", eventType: "memory" as const, tags: [] },
];

describe("annual review templates", () => {
  it("only summarizes events from the selected year", () => {
    const review = buildAnnualReview(events, 2024, "narrative");
    expect(review.count).toBe(2);
    expect(review.highlights.map((highlight) => highlight.title)).toEqual(["完成作品", "開始學習"]);
  });

  it("returns an intentional empty-state review for a year without events", () => {
    const review = buildAnnualReview(events, 2022, "reflection");
    expect(review.count).toBe(0);
    expect(review.highlights).toEqual([]);
    expect(review.prompt).toContain("還沒寫進時間帶");
  });
});

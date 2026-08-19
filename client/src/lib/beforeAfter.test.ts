import { getComparisonPair } from "./beforeAfter";
import { describe, expect, it } from "vitest";

const events = [
  { id: 1, occurredAt: 100, title: "早期工作桌", comparisonGroup: "工作桌演進", media: [{ url: "https://example.test/before.jpg" }] },
  { id: 2, occurredAt: 200, title: "中期草稿", comparisonGroup: "工作桌演進", media: [] },
  { id: 3, occurredAt: 300, title: "現在的工作桌", comparisonGroup: "工作桌演進", media: [{ url: "https://example.test/after.jpg" }] },
];

describe("before and after comparison helpers", () => {
  it("selects the earliest and latest media-backed events in a selected comparison group", () => {
    expect(getComparisonPair(events, events[2])).toMatchObject({ group: "工作桌演進", before: { id: 1 }, after: { id: 3 } });
  });

  it("does not create a misleading comparison when a group lacks two images", () => {
    expect(getComparisonPair(events, { ...events[0], comparisonGroup: "只有一張", media: [{ url: "https://example.test/only.jpg" }] })).toBeNull();
  });
});

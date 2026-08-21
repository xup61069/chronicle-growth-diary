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

  it("filters a Live Photo MOV before choosing comparison cover images", () => {
    const livePhotoEvents = [
      { id: 10, occurredAt: 100, title: "前", comparisonGroup: "Live", media: [{ url: "https://example.test/before.mov", mediaKind: "live_motion" as const }, { url: "https://example.test/before.jpg", mediaKind: "image" as const }] },
      { id: 11, occurredAt: 200, title: "後", comparisonGroup: "Live", media: [{ url: "https://example.test/after.mov", mediaKind: "live_motion" as const }, { url: "https://example.test/after.jpg", mediaKind: "image" as const }] },
    ];
    expect(getComparisonPair(livePhotoEvents, livePhotoEvents[1])).toMatchObject({ before: { media: [{ url: "https://example.test/before.jpg" }] }, after: { media: [{ url: "https://example.test/after.jpg" }] } });
  });
});

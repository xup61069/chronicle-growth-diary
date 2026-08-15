import { parseChronicleImport } from "./diaryImport";
import { describe, expect, it } from "vitest";

const sample = JSON.stringify({
  format: "chronicle-growth-diary",
  version: 1,
  exportedAt: "2025-01-01T00:00:00.000Z",
  diary: { title: "舊日記" },
  events: [{ occurredAt: "2024-05-03T00:00:00.000Z", datePrecision: "day", eventType: "memory", title: "第一次演出", body: "寫下現場的感受。", ageLabel: null, place: "禮堂", color: "#EE623B", tags: [{ name: "學校" }], media: [{ url: "https://example.test/photo.jpg", storageKey: "never-import" }], isPublic: true }],
});

describe("Chronicle JSON import preview", () => {
  it("keeps only safe event content and warns that media is skipped", () => {
    const preview = parseChronicleImport(sample);
    expect(preview.events[0]).toMatchObject({ title: "第一次演出", tagNames: ["學校"], color: "#EE623B" });
    expect(preview.skippedMediaCount).toBe(1);
    expect(JSON.stringify(preview)).not.toContain("never-import");
    expect(JSON.stringify(preview)).not.toContain("isPublic");
  });

  it("rejects an unknown format before any event is accepted", () => {
    expect(() => parseChronicleImport(JSON.stringify({ format: "other", version: 1, events: [] }))).toThrow("只支援 Chronicle JSON 匯出格式");
  });
});

import { createPortableDiaryExport, portableDiaryToMarkdown } from "./diaryPortable";
import { describe, expect, it } from "vitest";

const source = {
  diary: { title: "我的 # 成長\n故事", subtitle: "一段私人的紀錄", birthYear: 1994, publicStoryLayout: "editorial" as const, shareTokenHash: "must-never-export" },
  events: [{ occurredAt: Date.UTC(2024, 4, 3), datePrecision: "day" as const, eventType: "memory", title: "第一個 # 作品", body: "保留了細節。", ageLabel: null, place: "台北", color: "#EE623B", isPublic: false, timelinePosition: 1, phaseKeywords: ["自我定位", "創作探索"], tags: [{ name: "學習", color: "#587A8B" }], media: [{ url: "https://example.test/image.jpg", fileName: "image.jpg", mimeType: "image/jpeg", caption: "一張照片", sortOrder: 0, storageKey: "secret-object-key" }] }],
  reflections: [{ phaseKey: "education", recap: "學習的整理", reflection: "繼續前進", model: "manual-edit" }],
};

describe("portable diary export", () => {
  it("creates a versioned export without sharing credentials or storage keys", () => {
    const portable = createPortableDiaryExport(source, "2025-01-01T00:00:00.000Z");
    const serialized = JSON.stringify(portable);
    expect(portable).toMatchObject({ format: "chronicle-growth-diary", version: 1, exportedAt: "2025-01-01T00:00:00.000Z" });
    expect(serialized).not.toContain("must-never-export");
    expect(serialized).not.toContain("secret-object-key");
    expect(portable.events[0]?.phaseKeywords).toEqual(["自我定位", "創作探索"]);
    expect(portable.events[0]?.media[0]).toEqual({ url: "https://example.test/image.jpg", fileName: "image.jpg", mimeType: "image/jpeg", caption: "一張照片", sortOrder: 0 });
  });

  it("renders readable markdown with stable dates and sanitized headings", () => {
    const markdown = portableDiaryToMarkdown(createPortableDiaryExport(source, "2025-01-01T00:00:00.000Z"));
    expect(markdown).toContain("# 我的 # 成長 故事");
    expect(markdown).toContain("### 2024-05-03 · 第一個 # 作品");
    expect(markdown).toContain("- 階段關鍵字：#自我定位 #創作探索");
    expect(markdown).toContain("[image.jpg](https://example.test/image.jpg)：一張照片");
    expect(markdown).not.toContain("secret-object-key");
  });

  it("masks a future time capsule in both portable JSON and Markdown exports", () => {
    const futureUnlock = Date.UTC(2027, 0, 1);
    const portable = createPortableDiaryExport({
      ...source,
      events: [{ ...source.events[0], title: "未來的秘密", body: "不能先備份的內容", place: "私人地點", tags: [{ name: "秘密" }], media: [{ url: "https://example.test/private.jpg", fileName: "private.jpg", mimeType: "image/jpeg" }], unlocksAt: futureUnlock }],
    }, "2026-01-01T00:00:00.000Z", Date.UTC(2026, 0, 1));
    const markdown = portableDiaryToMarkdown(portable);

    expect(portable.events[0]).toMatchObject({ title: "時空膠囊鎖定中", isTimeCapsuleLocked: true, unlocksAt: "2027-01-01T00:00:00.000Z", tags: [], media: [] });
    expect(JSON.stringify(portable)).not.toContain("不能先備份的內容");
    expect(markdown).toContain("時空膠囊：鎖定至");
    expect(markdown).not.toContain("private.jpg");
  });
});

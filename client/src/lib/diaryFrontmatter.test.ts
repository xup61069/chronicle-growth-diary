import { createChronicleFrontmatter, parseChronicleFrontmatter } from "./diaryFrontmatter";
import { describe, expect, it } from "vitest";

const source = {
  diary: { title: "我的成長檔案", subtitle: "可提交至 Git 的事件" },
  events: [{ occurredAt: Date.UTC(2026, 0, 2), datePrecision: "day" as const, eventType: "chapter", title: "建立第一間工作室", body: "把散落的練習整理成自己的工作流。", ageLabel: null, place: "台北", color: "#EE623B", isPublic: false, tags: [{ name: "創作" }], skillNames: ["Ableton"], phaseKeywords: ["突破"], track: "skills", milestoneType: "highlight", milestoneWeight: 4, comparisonGroup: "工作室演進", unlocksAt: null, mapLatitudeE6: null, mapLongitudeE6: null, locationPrivacy: "none", soundtrackTitle: "深夜練習", soundtrackUrl: "https://example.test/theme.mp3" }],
};

describe("Chronicle Frontmatter", () => {
  it("exports deterministic Git-friendly event documents with rich Chronicle fields", () => {
    const markdown = createChronicleFrontmatter(source, "2026-01-03T00:00:00.000Z");
    expect(markdown).toContain('chronicle: "growth-diary"');
    expect(markdown).toContain('track: "skills"');
    expect(markdown).toContain('soundtrackTitle: "深夜練習"');
    expect(markdown).toContain("<!-- chronicle:event -->");
  });

  it("parses its own Frontmatter output through the existing safe import preview", () => {
    const preview = parseChronicleFrontmatter(createChronicleFrontmatter(source, "2026-01-03T00:00:00.000Z"));
    expect(preview).toMatchObject({ title: "我的成長檔案", events: [{ title: "建立第一間工作室", track: "skills", milestoneType: "highlight", skillNames: ["Ableton"], soundtrackTitle: "深夜練習" }] });
  });
});

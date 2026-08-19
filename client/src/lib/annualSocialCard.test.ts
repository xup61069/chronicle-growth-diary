import { buildAnnualShareCardData, createAnnualShareCardSvg } from "./annualSocialCard";
import { describe, expect, it } from "vitest";

describe("annual share cards", () => {
  const events = [
    { occurredAt: Date.UTC(2026, 0, 1), shareScope: "public" as const, tags: [{ name: "創作" }, { name: "學習" }] },
    { occurredAt: Date.UTC(2026, 4, 1), shareScope: "link" as const, tags: [{ name: "秘密計畫" }] },
    { occurredAt: Date.UTC(2026, 8, 1), shareScope: "private" as const, tags: [{ name: "私人反思" }] },
  ];

  it("only counts public events and public tag summaries", () => {
    expect(buildAnnualShareCardData(events, 2026, "公開事件的年度摘要。")).toEqual({ year: 2026, count: 1, tags: ["創作", "學習"], lead: "公開事件的年度摘要。" });
  });

  it("renders a high-resolution annual card without private tag names", () => {
    const svg = createAnnualShareCardSvg(buildAnnualShareCardData(events, 2026, "公開事件的年度摘要。"), "portrait");
    expect(svg).toContain('height="2000"');
    expect(svg).toContain("#創作");
    expect(svg).toContain("公開事件的年度摘要。");
    expect(svg).not.toContain("秘密計畫");
    expect(svg).not.toContain("私人反思");
  });
});

import { createMilestoneCardSvg } from "./socialMilestoneCard";
import { describe, expect, it } from "vitest";

describe("milestone social cards", () => {
  const event = { id: 11, occurredAt: Date.UTC(2026, 4, 1), title: "完成 <重要> 作品", body: "把多年練習變成真正的里程碑。", track: "career" as const, milestoneType: "highlight" as const, milestoneWeight: 4, color: "#EE623B" };

  it("creates high-resolution square cards with escaped event content", () => {
    const svg = createMilestoneCardSvg(event, "square");
    expect(svg).toContain('width="1600" height="1600"');
    expect(svg).toContain("完成 &lt;重要&gt; 作品");
    expect(svg).toContain("高光時刻");
  });

  it("creates portrait cards for vertical social sharing", () => {
    expect(createMilestoneCardSvg(event, "portrait")).toContain('height="2000"');
  });
});

import { describe, expect, it } from "vitest";
import { buildGrowthDashboardSnapshot, summarizeWritingStreak } from "./growthStats";

const anchors = {
  birthYear: 2000,
  childhoodStartYear: 2000,
  childhoodEndYear: 2006,
  educationStartYear: 2007,
  educationEndYear: 2018,
  careerStartYear: 2019,
  careerEndYear: null,
};

describe("growth dashboard aggregates", () => {
  it("derives keyword, phase, density and streak summaries from private events only", () => {
    const result = buildGrowthDashboardSnapshot(
      [
        { occurredAt: Date.UTC(2005, 0, 2), eventType: "memory", ageLabel: "5 歲", phaseKeywords: JSON.stringify(["觀察", "家人"]), shareScope: "private", isPublic: false },
        { occurredAt: Date.UTC(2005, 0, 3), eventType: "learning", ageLabel: "6 歲", phaseKeywords: JSON.stringify(["觀察"]), shareScope: "private", isPublic: false },
        { occurredAt: Date.UTC(2024, 5, 1), eventType: "achievement", ageLabel: "24 歲", phaseKeywords: JSON.stringify(["發表"]), shareScope: "private", isPublic: false },
        { occurredAt: Date.UTC(2024, 5, 2), eventType: "achievement", ageLabel: "24 歲", phaseKeywords: JSON.stringify(["不應統計"]), shareScope: "public", isPublic: true },
      ],
      anchors as never,
      [{ period: "2005-01", count: "2" }, { period: "2024-06", count: 1 }],
      [{ period: "2005-01-02", count: 1 }, { period: "2005-01-03", count: 1 }, { period: "2024-06-01", count: 1 }],
    );

    expect(result.summary).toMatchObject({ privateEventCount: 3, writingDayCount: 3, recentStreak: 1, longestStreak: 2 });
    expect(result.monthlyDensity).toEqual([{ month: "2005-01", count: 2 }, { month: "2024-06", count: 1 }]);
    expect(result.keywords).toEqual([{ label: "觀察", count: 2 }, { label: "家人", count: 1 }, { label: "發表", count: 1 }]);
    expect(result.keywords.some((keyword) => keyword.label === "不應統計")).toBe(false);
    expect(result.phaseDensity).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "childhood", count: 2 }),
      expect.objectContaining({ key: "career", count: 1 }),
    ]));
  });

  it("returns zero-value streaks for an empty writing history", () => {
    expect(summarizeWritingStreak([])).toEqual({ recentStreak: 0, longestStreak: 0 });
  });
});

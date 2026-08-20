import { describe, expect, it } from "vitest";
import { describeCurrentStreak, formatDashboardDate, formatDashboardMonth } from "./growthDashboard";

describe("growth dashboard presentation helpers", () => {
  it("formats aggregate periods and nullable archive dates for Traditional Chinese readers", () => {
    expect(formatDashboardMonth("2026-04")).toBe("2026 年 4 月");
    expect(formatDashboardMonth("unknown")).toBe("unknown");
    expect(formatDashboardDate(null)).toBe("尚未開始");
    expect(formatDashboardDate(Date.UTC(2026, 3, 15))).toContain("2026");
  });

  it("uses an honest writing-streak label when activity is sparse", () => {
    expect(describeCurrentStreak(0)).toBe("尚未形成連續紀錄");
    expect(describeCurrentStreak(1)).toBe("最近一次紀錄");
    expect(describeCurrentStreak(4)).toBe("連續 4 天");
  });
});

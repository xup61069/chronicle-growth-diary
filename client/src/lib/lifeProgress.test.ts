import { formatCapsuleCountdown, getLifeProgress, getTimeCapsuleStatus } from "./lifeProgress";
import { describe, expect, it } from "vitest";

describe("life progress helpers", () => {
  it("derives a stable capsule lock status and human-readable countdown", () => {
    const now = Date.UTC(2026, 0, 1);
    expect(getTimeCapsuleStatus(now + 2.1 * 24 * 60 * 60 * 1000, now)).toMatchObject({ isLocked: true, daysRemaining: 3 });
    expect(formatCapsuleCountdown(3)).toBe("剩 3 天解鎖");
    expect(getTimeCapsuleStatus(now, now)).toMatchObject({ isLocked: false, daysRemaining: 0 });
  });

  it("calculates an optional progress ring from year-only data without requiring a birth date", () => {
    expect(getLifeProgress(1996, 2026, 90)).toEqual({ age: 30, horizonYears: 90, percentage: 33 });
    expect(getLifeProgress(null, 2026, 90)).toBeNull();
  });
});

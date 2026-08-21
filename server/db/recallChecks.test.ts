import { describe, expect, it } from "vitest";
import { buildRecallCheckSummary } from "./recallChecks";

const request = { year: 2026, month: 5, day: 17, timezoneOffsetMinutes: -480 };
const now = Date.UTC(2026, 4, 17, 12);

function event(overrides: Partial<{ occurredAt: number; datePrecision: "day" | "month" | "year"; unlocksAt: number | null; shareScope: "private" | "public" | "link"; isPublic: boolean }> = {}) {
  return {
    occurredAt: Date.UTC(2021, 4, 17, 8),
    datePrecision: "day" as const,
    unlocksAt: null,
    shareScope: "private" as const,
    isPublic: false,
    ...overrides,
  };
}

describe("buildRecallCheckSummary", () => {
  it("counts only prior-year, day-precision private eligibility without accepting content fields", () => {
    expect(buildRecallCheckSummary([
      event(),
      event({ datePrecision: "month" }),
      event({ occurredAt: Date.UTC(2026, 4, 17, 8) }),
      event({ shareScope: "link" }),
      event({ isPublic: true }),
    ], request, now)).toEqual({ onThisDayCount: 1, futureLetterCount: 0, status: "checked_items" });
  });

  it("counts due private future letters without exposing their title or body", () => {
    expect(buildRecallCheckSummary([
      event({ unlocksAt: Date.UTC(2026, 4, 17, 10) }),
      event({ unlocksAt: Date.UTC(2026, 4, 18, 10) }),
      event({ unlocksAt: Date.UTC(2026, 4, 17, 10), shareScope: "public" }),
    ], request, now)).toEqual({ onThisDayCount: 2, futureLetterCount: 1, status: "checked_items" });
  });

  it("returns an explicit empty status when no eligible private record exists", () => {
    expect(buildRecallCheckSummary([event({ shareScope: "public" })], request, now)).toEqual({ onThisDayCount: 0, futureLetterCount: 0, status: "checked_empty" });
  });
});

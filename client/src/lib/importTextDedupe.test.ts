import { describe, expect, it } from "vitest";
import { findTextImportDuplicateCandidates, normalizeImportShortTitle, utcDateKey } from "./importTextDedupe";

describe("local text import duplicate candidates", () => {
  it("normalizes a bounded title and compares only its UTC calendar date", () => {
    expect(normalizeImportShortTitle("  旅行：台北！ ")).toBe("旅行台北");
    expect(utcDateKey(Date.parse("2026-08-22T23:30:00-04:00"))).toBe("2026-08-23");
    expect(findTextImportDuplicateCandidates([
      { id: "one", title: "旅行：台北", occurredAt: Date.parse("2026-08-23T01:00:00.000Z") },
      { id: "two", title: "旅行 台北！", occurredAt: Date.parse("2026-08-23T23:00:00.000Z") },
      { id: "other-date", title: "旅行 台北", occurredAt: Date.parse("2026-08-24T01:00:00.000Z") },
      { id: "empty", title: "  ", occurredAt: Date.parse("2026-08-23T01:00:00.000Z") },
    ])).toEqual([{ id: "one|two", itemIds: ["one", "two"], normalizedTitle: "旅行台北", utcDate: "2026-08-23" }]);
  });
});

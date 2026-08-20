import { describe, expect, it } from "vitest";
import { buildMonthlyDigest, getAvailablePrivateMonths } from "./monthlyDigest";

const event = (id: number, occurredAt: number, overrides: Partial<{ datePrecision: "day" | "month" | "year"; eventType: "memory" | "learning" | "achievement" | "chapter"; shareScope: "private" | "public" | "link"; isPublic: boolean; unlocksAt: number | null; tags: Array<{ name: string }> }> = {}) => ({
  id,
  occurredAt,
  datePrecision: "day" as const,
  eventType: "memory" as const,
  title: `event-${id}`,
  body: "測試事件內容",
  shareScope: "private" as const,
  isPublic: false,
  unlocksAt: null,
  tags: [],
  ...overrides,
});

describe("monthly private digest", () => {
  it("lists selectable private months and excludes public, link and year-only records", () => {
    const events = [
      event(1, Date.UTC(2026, 7, 2)),
      event(2, Date.UTC(2026, 6, 2), { datePrecision: "month" }),
      event(3, Date.UTC(2026, 7, 2), { shareScope: "public", isPublic: true }),
      event(4, Date.UTC(2026, 5, 2), { shareScope: "link" }),
      event(5, Date.UTC(2026, 0, 1), { datePrecision: "year" }),
    ];
    expect(getAvailablePrivateMonths(events)).toEqual([{ year: 2026, month: 8 }, { year: 2026, month: 7 }]);
  });

  it("summarizes private events by type and tags while retaining locked events for print masking", () => {
    const now = Date.UTC(2026, 7, 20);
    const digest = buildMonthlyDigest([
      event(1, Date.UTC(2026, 7, 2), { eventType: "learning", tags: [{ name: "閱讀" }] }),
      event(2, Date.UTC(2026, 7, 18), { eventType: "achievement", unlocksAt: now + 86_400_000, tags: [{ name: "閱讀" }, { name: "練習" }] }),
      event(3, Date.UTC(2026, 6, 2)),
      event(4, Date.UTC(2026, 7, 19), { shareScope: "link" }),
    ], { year: 2026, month: 8 }, now);
    expect(digest).toMatchObject({ count: 2, availableCount: 1, lockedCount: 1, typeCounts: { memory: 0, learning: 1, achievement: 1, chapter: 0 }, tags: ["閱讀", "練習"] });
    expect(digest.events.map((item) => item.id)).toEqual([1, 2]);
  });
});

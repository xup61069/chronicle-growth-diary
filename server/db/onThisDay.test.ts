import { describe, expect, it } from "vitest";
import { buildOwnerOnThisDayMemories } from "./onThisDay";

const now = Date.UTC(2026, 4, 17, 9);
const request = { year: 2026, month: 5, day: 17, timezoneOffsetMinutes: 0 };
const event = (id: number, occurredAt: number, overrides: Partial<{ datePrecision: "day" | "month" | "year"; eventType: "memory" | "learning" | "achievement" | "chapter"; title: string; unlocksAt: number | null; shareScope: "private" | "public" | "link"; isPublic: boolean }> = {}) => ({
  id,
  occurredAt,
  datePrecision: "day" as const,
  eventType: "memory" as const,
  title: `event-${id}`,
  unlocksAt: null,
  shareScope: "private" as const,
  isPublic: false,
  ...overrides,
});

describe("owner on-this-day memories", () => {
  it("returns a minimal previous-year, private exact-date projection only to the owner", () => {
    const source = [
      event(1, Date.UTC(2024, 4, 17)),
      event(2, Date.UTC(2020, 4, 17)),
      event(3, Date.UTC(2026, 4, 17)),
      event(4, Date.UTC(2024, 4, 16)),
      event(5, Date.UTC(2024, 4, 17), { shareScope: "public", isPublic: true }),
      event(6, Date.UTC(2024, 4, 17), { datePrecision: "month" }),
      event(7, Date.UTC(2024, 4, 17), { shareScope: "link" }),
      event(8, Date.UTC(2024, 4, 17), { datePrecision: "year" }),
    ];
    expect(buildOwnerOnThisDayMemories(source, "owner", request, now)).toEqual([
      { id: 1, occurredAt: Date.UTC(2024, 4, 17), yearsAgo: 2, isLocked: false, daysRemaining: 0, title: "event-1", eventType: "memory" },
      { id: 2, occurredAt: Date.UTC(2020, 4, 17), yearsAgo: 6, isLocked: false, daysRemaining: 0, title: "event-2", eventType: "memory" },
    ]);
    expect(buildOwnerOnThisDayMemories(source, "editor", request, now)).toEqual([]);
    expect(buildOwnerOnThisDayMemories(source, "commenter", request, now)).toEqual([]);
  });

  it("keeps a locked capsule listable while withholding its title and type", () => {
    const memories = buildOwnerOnThisDayMemories([event(7, Date.UTC(2022, 4, 17), { title: "不應回傳的標題", unlocksAt: now + 2.1 * 86_400_000 })], "owner", request, now);
    expect(memories).toEqual([{ id: 7, occurredAt: Date.UTC(2022, 4, 17), yearsAgo: 4, isLocked: true, daysRemaining: 3, title: null, eventType: null }]);
  });
});

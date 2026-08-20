import { describe, expect, it } from "vitest";
import { getFutureLetters } from "./futureLetters";

const now = Date.UTC(2026, 7, 20);
const event = (id: number, unlocksAt: number | null, overrides: Partial<{ shareScope: "private" | "public" | "link"; isPublic: boolean; title: string }> = {}) => ({
  id,
  occurredAt: Date.UTC(2026, 7, 1),
  unlocksAt,
  title: `letter-${id}`,
  shareScope: "private" as const,
  isPublic: false,
  ...overrides,
});

describe("future letters", () => {
  it("indexes only private capsules, prioritizes locked letters by nearest unlock date, and strips their titles", () => {
    const letters = getFutureLetters([
      event(1, now + 50 * 86_400_000),
      event(2, now + 2 * 86_400_000),
      event(3, now - 86_400_000),
      event(4, now + 86_400_000, { shareScope: "link" }),
      event(5, now + 86_400_000, { shareScope: "public", isPublic: true }),
      event(6, null),
    ], now);
    expect(letters).toEqual([
      { id: 2, unlocksAt: now + 2 * 86_400_000, isLocked: true, daysRemaining: 2, title: null, isSoon: true },
      { id: 1, unlocksAt: now + 50 * 86_400_000, isLocked: true, daysRemaining: 50, title: null, isSoon: false },
      { id: 3, unlocksAt: now - 86_400_000, isLocked: false, daysRemaining: 0, title: "letter-3", isSoon: false },
    ]);
  });
});

import { describe, expect, it, vi } from "vitest";
import { buildOnThisDayIcs, getOnThisDayIcsByToken } from "./onThisDayFeed";

describe("On This Day ICS feed", () => {
  it("emits only an all-day recurring title and date, escaping ICS text and excluding locked events", () => {
    const ics = buildOnThisDayIcs([
      { id: 8, occurredAt: Date.UTC(2020, 4, 6), title: "散步, 公園; 春天", unlocksAt: null },
      { id: 9, occurredAt: Date.UTC(2021, 5, 7), title: "未解鎖", unlocksAt: Date.now() + 60_000 },
    ]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20200506");
    expect(ics).toContain("RRULE:FREQ=YEARLY");
    expect(ics).toContain("SUMMARY:散步\\, 公園\\; 春天");
    expect(ics).toMatch(/UID:[a-f0-9]{32}@chronicle\.invalid/);
    expect(ics).not.toContain("chronicle-on-this-day-8");
    expect(ics).not.toContain("未解鎖");
    expect(ics).not.toContain("DESCRIPTION:");
    expect(ics).not.toContain("GEO:");
    expect(ics).not.toContain("ATTACH:");
  });

  it("returns no feed and queries no events when the supplied token has been revoked or does not exist", async () => {
    const select = vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) }));
    await expect(getOnThisDayIcsByToken({ select } as never, "safe-rotated-token-value")).resolves.toBeNull();
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("returns no feed and queries no events after the token expiry timestamp", async () => {
    const select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{
            diaryId: 7,
            tokenHash: "a".repeat(64),
            expiresAt: Date.now() - 1,
          }]),
        })),
      })),
    }));
    await expect(getOnThisDayIcsByToken({ select } as never, "safe-expired-token-value")).resolves.toBeNull();
    expect(select).toHaveBeenCalledTimes(1);
  });
});

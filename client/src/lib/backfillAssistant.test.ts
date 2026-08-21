import { describe, expect, it } from "vitest";
import { getBackfillAssistantSnapshot } from "./backfillAssistant";

describe("getBackfillAssistantSnapshot", () => {
  const now = Date.parse("2026-08-22T12:00:00.000Z");

  it("uses only the latest past event timestamp and a bounded local photo count", () => {
    const snapshot = getBackfillAssistantSnapshot([
      { occurredAt: Date.parse("2026-08-10T09:00:00.000Z") },
      { occurredAt: Date.parse("2026-08-27T09:00:00.000Z") },
      { occurredAt: Date.parse("2026-08-18T15:00:00.000Z") },
    ], 34.8, now);

    expect(snapshot).toEqual({
      daysSinceLatestEvent: 3,
      latestEventOccurredAt: Date.parse("2026-08-18T15:00:00.000Z"),
      pendingPhotoCount: 34,
      needsNudge: true,
    });
  });

  it("asks for a first record without inspecting any event content", () => {
    expect(getBackfillAssistantSnapshot([], -5, now)).toEqual({
      daysSinceLatestEvent: null,
      latestEventOccurredAt: null,
      pendingPhotoCount: 0,
      needsNudge: true,
    });
  });
});

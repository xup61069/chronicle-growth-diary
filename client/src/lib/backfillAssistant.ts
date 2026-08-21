export type BackfillEvent = { occurredAt: number };

export type BackfillAssistantSnapshot = {
  daysSinceLatestEvent: number | null;
  latestEventOccurredAt: number | null;
  pendingPhotoCount: number;
  needsNudge: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function getBackfillAssistantSnapshot(events: BackfillEvent[], pendingPhotoCount: number, now = Date.now()): BackfillAssistantSnapshot {
  const pastEventTimes = events
    .map((event) => event.occurredAt)
    .filter((occurredAt) => Number.isFinite(occurredAt) && occurredAt <= now);
  const latestEventOccurredAt = pastEventTimes.length ? Math.max(...pastEventTimes) : null;
  const daysSinceLatestEvent = latestEventOccurredAt === null ? null : Math.max(0, Math.floor((now - latestEventOccurredAt) / DAY_MS));
  const safePendingPhotoCount = Math.max(0, Math.floor(pendingPhotoCount));
  return {
    daysSinceLatestEvent,
    latestEventOccurredAt,
    pendingPhotoCount: safePendingPhotoCount,
    needsNudge: daysSinceLatestEvent === null || daysSinceLatestEvent >= 7 || safePendingPhotoCount > 0,
  };
}

import type { JourneyImportCandidate } from "./journeyImport";

export type JourneyReviewDraft = JourneyImportCandidate & { dateInput: string };

const JOURNEY_MIN_TIMESTAMP = -2_208_988_800_000;
const JOURNEY_MAX_TIMESTAMP = 4_102_444_800_000;

export function journeyDateInputFromTimestamp(timestamp: number) {
  const local = new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function journeyTimestampFromDateInput(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isSafeInteger(timestamp) && timestamp >= JOURNEY_MIN_TIMESTAMP && timestamp <= JOURNEY_MAX_TIMESTAMP ? timestamp : null;
}

export function createJourneyReviewDraft(candidate: JourneyImportCandidate): JourneyReviewDraft {
  return { ...candidate, dateInput: journeyDateInputFromTimestamp(candidate.occurredAt) };
}

export function finalizeJourneyReviewDraft(draft: JourneyReviewDraft): JourneyImportCandidate | null {
  const occurredAt = journeyTimestampFromDateInput(draft.dateInput);
  if (occurredAt === null) return null;
  return { sourceId: draft.sourceId, occurredAt, title: draft.title.slice(0, 180), body: draft.body, tagNames: draft.tagNames };
}

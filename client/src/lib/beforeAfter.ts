export type ComparisonEvent = {
  id: number;
  occurredAt: number;
  title: string;
  comparisonGroup?: string | null;
  media: Array<{ url: string; caption?: string | null; mediaKind?: "image" | "live_motion" }>;
};

export function getComparisonPair<T extends ComparisonEvent>(events: T[], selectedEvent?: T | null) {
  const group = selectedEvent?.comparisonGroup?.trim();
  if (!group) return null;
  const candidates = events
    .map((event) => ({ ...event, media: getStaticImageMedia(event.media) }))
    .filter((event) => event.comparisonGroup?.trim() === group && event.media[0]?.url)
    .sort((left, right) => left.occurredAt - right.occurredAt);
  if (candidates.length < 2) return null;
  const before = candidates[0];
  const after = candidates[candidates.length - 1];
  if (!before || !after || before.id === after.id) return null;
  return { group, before, after };
}
import { getStaticImageMedia } from "./mediaPresentation";

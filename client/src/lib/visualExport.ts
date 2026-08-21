import { getTimeCapsuleStatus } from "./lifeProgress";

export type VisualExportEvent = {
  id: number;
  occurredAt: number;
  datePrecision: "day" | "month" | "year";
  ageLabel?: string | null;
  title: string;
  body: string;
  place?: string | null;
  color: string;
  unlocksAt?: number | null;
  tags: Array<{ id: number; name: string }>;
  media: Array<{ url: string; caption?: string | null; mediaKind?: "image" | "live_motion" }>;
};

export function getVisualExportRecord<T extends VisualExportEvent>(event: T, now = Date.now()) {
  const capsule = getTimeCapsuleStatus(event.unlocksAt, now);
  if (!capsule.isLocked) return { ...event, media: getStaticImageMedia(event.media), isTimeCapsuleLocked: false, capsule };
  return {
    ...event,
    title: "時空膠囊鎖定中",
    body: "",
    ageLabel: null,
    place: null,
    media: [],
    tags: [],
    isTimeCapsuleLocked: true,
    capsule,
  };
}
import { getStaticImageMedia } from "./mediaPresentation";

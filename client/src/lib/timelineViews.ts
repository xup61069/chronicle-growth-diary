export type TimelineViewMode = "timeline" | "bento" | "map";

export const timelineViewOptions = [
  { key: "timeline", label: "時間軸", description: "依軌道並列閱讀事件" },
  { key: "bento", label: "精華格", description: "以里程碑權重掃描摘要" },
  { key: "map", label: "足跡圖", description: "以私有座標查看空間分佈" },
] as const;

export type TimelineViewEvent = {
  id: number;
  occurredAt: number;
  title: string;
  place?: string | null;
  mapLatitudeE6?: number | null;
  mapLongitudeE6?: number | null;
  locationPrivacy?: "none" | "city" | "precise";
  track: "career" | "skills" | "life" | "hardware";
  milestoneWeight: number;
  media: Array<{ url: string; caption?: string | null }>;
};

export function getBentoSpan(weight: number) {
  if (weight >= 5) return "feature" as const;
  if (weight >= 3) return "focus" as const;
  return "standard" as const;
}

export function buildPlaceFootprints<T extends TimelineViewEvent>(events: T[]) {
  const footprints = new Map<string, { place: string; events: T[]; tracks: Set<T["track"]> }>();
  for (const event of events) {
    const place = event.place?.trim().replace(/\s+/g, " ");
    if (!place) continue;
    const key = place.toLocaleLowerCase();
    const existing = footprints.get(key) ?? { place, events: [], tracks: new Set<T["track"]>() };
    existing.events.push(event);
    existing.tracks.add(event.track);
    footprints.set(key, existing);
  }
  return Array.from(footprints.values())
    .map((footprint) => ({
      place: footprint.place,
      events: footprint.events.sort((left, right) => left.occurredAt - right.occurredAt),
      tracks: Array.from(footprint.tracks),
      firstSeenAt: Math.min(...footprint.events.map((event) => event.occurredAt)),
      lastSeenAt: Math.max(...footprint.events.map((event) => event.occurredAt)),
    }))
    .sort((left, right) => left.firstSeenAt - right.firstSeenAt);
}

export function buildSpatialFootprints<T extends TimelineViewEvent>(events: T[]) {
  return events
    .filter((event): event is T & { mapLatitudeE6: number; mapLongitudeE6: number } => typeof event.mapLatitudeE6 === "number" && typeof event.mapLongitudeE6 === "number")
    .map((event) => {
      const latitude = event.mapLatitudeE6 / 1_000_000;
      const longitude = event.mapLongitudeE6 / 1_000_000;
      return {
        ...event,
        latitude,
        longitude,
        x: ((longitude + 180) / 360) * 100,
        y: ((90 - latitude) / 180) * 100,
      };
    })
    .sort((left, right) => left.occurredAt - right.occurredAt);
}

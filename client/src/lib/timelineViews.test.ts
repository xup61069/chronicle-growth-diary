import { buildPlaceFootprints, buildSpatialFootprints, getBentoSpan } from "./timelineViews";
import { describe, expect, it } from "vitest";

const events = [
  { id: 1, occurredAt: 200, title: "回到工作室", place: "台北工作室", mapLatitudeE6: 25_033_000, mapLongitudeE6: 121_565_000, locationPrivacy: "precise" as const, track: "career" as const, milestoneWeight: 5, media: [] },
  { id: 2, occurredAt: 100, title: "第一次彩排", place: "台北工作室", track: "skills" as const, milestoneWeight: 3, media: [] },
  { id: 3, occurredAt: 300, title: "散步", place: "河畔", track: "life" as const, milestoneWeight: 1, media: [] },
  { id: 4, occurredAt: 400, title: "沒有地點", place: null, track: "life" as const, milestoneWeight: 1, media: [] },
];

describe("timeline view helpers", () => {
  it("derives bento hierarchy from milestone weight", () => {
    expect(getBentoSpan(5)).toBe("feature");
    expect(getBentoSpan(3)).toBe("focus");
    expect(getBentoSpan(1)).toBe("standard");
  });

  it("groups private place labels locally without geocoding or GPS coordinates", () => {
    expect(buildPlaceFootprints(events)).toEqual([
      expect.objectContaining({ place: "台北工作室", tracks: ["career", "skills"], firstSeenAt: 100, lastSeenAt: 200, events: [expect.objectContaining({ id: 2 }), expect.objectContaining({ id: 1 })] }),
      expect.objectContaining({ place: "河畔", tracks: ["life"], firstSeenAt: 300, lastSeenAt: 300 }),
    ]);
  });

  it("projects only manually stored private coordinates onto a deterministic world grid", () => {
    const spatial = buildSpatialFootprints(events);
    expect(spatial).toHaveLength(1);
    expect(spatial[0]).toMatchObject({ id: 1, latitude: 25.033, longitude: 121.565 });
    expect(spatial[0]?.x).toBeCloseTo(83.768, 3);
    expect(spatial[0]?.y).toBeCloseTo(36.093, 3);
  });
});

import { describe, expect, it } from "vitest";
import { padFaceRegions } from "./sharePhotoDeidentification";

describe("share photo de-identification", () => {
  it("adds a bounded safety margin to every detected face without leaking image dimensions", () => {
    const [region] = padFaceRegions([{ xMin: 10, yMin: 10, width: 20, height: 30 }], 100, 80);
    expect(region).toBeDefined();
    expect(region!.xMin).toBeCloseTo(1.6);
    expect(region!.yMin).toBeCloseTo(1.6);
    expect(region!.width).toBeCloseTo(36.8);
    expect(region!.height).toBeCloseTo(46.8);
  });

  it("drops invalid and fully out-of-frame regions before the canvas operation", () => {
    expect(padFaceRegions([{ xMin: 0, yMin: 0, width: -1, height: 2 }, { xMin: 200, yMin: 200, width: 20, height: 20 }], 100, 100)).toEqual([]);
  });
});

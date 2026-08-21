import { describe, expect, it } from "vitest";
import { clampBlurMask, createManualBlurMask, padFaceRegions } from "./sharePhotoDeidentification";

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

  it("creates a centered manual mask and clamps owner corrections to the photo bounds", () => {
    expect(createManualBlurMask(200, 100, "manual-1")).toMatchObject({ id: "manual-1", source: "manual", xMin: 78, yMin: 39, width: 44, height: 22 });
    expect(clampBlurMask({ xMin: 180, yMin: 90, width: 40, height: 30 }, 200, 100)).toEqual({ xMin: 180, yMin: 90, width: 20, height: 10 });
    expect(clampBlurMask({ xMin: 20, yMin: 20, width: 0, height: 10 }, 100, 100)).toBeNull();
  });
});

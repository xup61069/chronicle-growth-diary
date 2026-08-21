import { describe, expect, it } from "vitest";
import { getPrimaryStaticImage, getStaticImageMedia } from "./mediaPresentation";

describe("timeline media presentation", () => {
  it("never promotes a Live Photo MOV to a timeline cover when it is sorted before a still image", () => {
    const media = [
      { mediaKind: "live_motion" as const, url: "/private/motion.mov" },
      { mediaKind: "image" as const, url: "/private/still.jpg", caption: "靜態照片" },
    ];
    expect(getPrimaryStaticImage(media)).toMatchObject({ url: "/private/still.jpg" });
    expect(getStaticImageMedia(media)).toEqual([media[1]]);
  });

  it("treats historical media rows without a kind as static images", () => {
    expect(getPrimaryStaticImage([{ url: "/legacy/photo.jpg" }])).toMatchObject({ url: "/legacy/photo.jpg" });
  });
});

import { describe, expect, it } from "vitest";
import { isSupportedImageMimeType, normalizeTagNames, safeMediaName } from "./diaryHelpers";

describe("growth diary helpers", () => {
  it("normalizes, deduplicates, and limits personal event tags", () => {
    expect(
      normalizeTagNames([" 學習 ", "學習", "", "家庭 時光", "成長", "成長", "旅行"]),
    ).toEqual(["學習", "家庭 時光", "成長", "旅行"]);
  });

  it("creates a safe storage filename for uploaded diary images", () => {
    expect(safeMediaName("我的 童年／照片 01!.jpg")).toBe("-01-.jpg");
    expect(safeMediaName("   ")).toBe("memory-image");
  });

  it("allows only supported image formats", () => {
    expect(isSupportedImageMimeType("image/webp")).toBe(true);
    expect(isSupportedImageMimeType("application/pdf")).toBe(false);
  });
});

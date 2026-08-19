import { consumeTagInputEnter, formatDate, formatInputDate, makeEmptyForm, parseCoordinateE6, toTimestamp } from "./diaryEditor";
import { describe, expect, it, vi } from "vitest";

describe("diary editor helpers", () => {
  it("creates an independent empty form with the archive defaults", () => {
    const first = makeEmptyForm();
    const second = makeEmptyForm();
    first.tagNames.push("不應共用");
    first.skillNames.push("不應共用的技能");
    first.phaseKeywords.push("不應共用的階段關鍵字");
    expect(second.tagNames).toEqual([]);
    expect(second.skillNames).toEqual([]);
    expect(second.phaseKeywords).toEqual([]);
    expect(second).toMatchObject({
      datePrecision: "day",
      eventType: "memory",
      color: "#EE623B",
      track: "life",
      milestoneType: "standard",
      milestoneWeight: 1,
      comparisonGroup: "",
      unlocksAt: "",
      mapLatitude: "",
      mapLongitude: "",
      locationPrivacy: "none",
      soundtrackTitle: "",
      soundtrackUrl: "",
    });
  });

  it("converts display precision to a stable local calendar timestamp", () => {
    expect(new Date(toTimestamp("2024-05-23", "year")).getMonth()).toBe(0);
    expect(new Date(toTimestamp("2024-05", "month")).getDate()).toBe(1);
    expect(formatInputDate(toTimestamp("2024-05-23", "day"))).toBe("2024-05-23");
    expect(formatDate(toTimestamp("2024-05", "month"), "month")).toContain("2024 年 5 月");
  });

  it("converts only valid private coordinate input into bounded E6 integers", () => {
    expect(parseCoordinateE6("25.033", 90)).toBe(25_033_000);
    expect(parseCoordinateE6("", 90)).toBeNull();
    expect(parseCoordinateE6("91", 90)).toBeUndefined();
    expect(parseCoordinateE6("not-a-coordinate", 180)).toBeUndefined();
  });

  it("consumes Enter in the tag field before it can submit the enclosing event form", () => {
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const addTag = vi.fn();

    expect(consumeTagInputEnter({ key: "Enter", preventDefault, stopPropagation }, addTag)).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(addTag).toHaveBeenCalledOnce();
    expect(consumeTagInputEnter({ key: "Tab", preventDefault, stopPropagation }, addTag)).toBe(false);
    expect(addTag).toHaveBeenCalledOnce();
  });
});

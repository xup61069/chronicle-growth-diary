import { formatDate, formatInputDate, makeEmptyForm, toTimestamp } from "./diaryEditor";
import { describe, expect, it } from "vitest";

describe("diary editor helpers", () => {
  it("creates an independent empty form with the archive defaults", () => {
    const first = makeEmptyForm();
    const second = makeEmptyForm();
    first.tagNames.push("不應共用");
    expect(second.tagNames).toEqual([]);
    expect(second).toMatchObject({ datePrecision: "day", eventType: "memory", color: "#EE623B" });
  });

  it("converts display precision to a stable local calendar timestamp", () => {
    expect(new Date(toTimestamp("2024-05-23", "year")).getMonth()).toBe(0);
    expect(new Date(toTimestamp("2024-05", "month")).getDate()).toBe(1);
    expect(formatInputDate(toTimestamp("2024-05-23", "day"))).toBe("2024-05-23");
    expect(formatDate(toTimestamp("2024-05", "month"), "month")).toContain("2024 年 5 月");
  });
});

import { describe, expect, it } from "vitest";
import { getFamilyAudienceAuditQueryRange } from "./familyAudienceAuditRange";

describe("family audience audit date range", () => {
  it("creates inclusive local calendar boundaries without adding audit content to the query", () => {
    const result = getFamilyAudienceAuditQueryRange({ fromDate: "2026-08-01", toDate: "2026-08-01" });
    expect(result.error).toBeNull();
    expect(result.input?.from).toBe(new Date("2026-08-01T00:00:00.000").getTime());
    expect(result.input?.to).toBe(new Date("2026-08-01T23:59:59.999").getTime());
  });

  it("rejects inverted, malformed, and excessive ranges rather than broadening a query", () => {
    expect(getFamilyAudienceAuditQueryRange({ fromDate: "2026-08-02", toDate: "2026-08-01" })).toMatchObject({ input: undefined, error: "開始日期不能晚於結束日期。" });
    expect(getFamilyAudienceAuditQueryRange({ fromDate: "not-a-date", toDate: "" })).toMatchObject({ input: undefined, error: "請輸入有效的稽核日期。" });
    expect(getFamilyAudienceAuditQueryRange({ fromDate: "2024-01-01", toDate: "2026-01-02" })).toMatchObject({ input: undefined, error: "日期區間最多可查詢 366 天。" });
  });
});

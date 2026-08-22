import { describe, expect, it } from "vitest";
import { applyJourneyReviewBatchDateTime, createJourneyReviewDraft, finalizeJourneyReviewDraft, journeyTimestampFromDateInput } from "./journeyImportDraft";

const candidate = { sourceId: "entry-1", occurredAt: 1_741_381_000_000, title: "原始標題", body: "只保留的純文字", tagNames: ["Journey 匯入", "旅行"] };

describe("Journey review drafts", () => {
  it("keeps title and datetime edits in a review-only candidate without provider metadata", () => {
    const draft = { ...createJourneyReviewDraft(candidate), title: "修改後標題", dateInput: "2025-03-10T10:30" };
    expect(finalizeJourneyReviewDraft(draft)).toEqual({ ...candidate, title: "修改後標題", occurredAt: new Date("2025-03-10T10:30").getTime() });
  });

  it("rejects an invalid or out-of-range local datetime before import confirmation", () => {
    expect(journeyTimestampFromDateInput("not-a-date")).toBeNull();
    expect(finalizeJourneyReviewDraft({ ...createJourneyReviewDraft(candidate), dateInput: "1800-01-01T00:00" })).toBeNull();
  });

  it("rebuilds a resettable draft from only the parser-approved candidate fields", () => {
    const reset = createJourneyReviewDraft(candidate);
    expect(Object.keys(reset).sort()).toEqual(["body", "dateInput", "occurredAt", "sourceId", "tagNames", "title"]);
    expect(reset.title).toBe("原始標題");
  });

  it("applies a valid local batch datetime only to selected in-memory drafts", () => {
    const first = createJourneyReviewDraft(candidate);
    const second = createJourneyReviewDraft({ ...candidate, sourceId: "entry-2", title: "第二筆" });
    const result = applyJourneyReviewBatchDateTime([first, second], ["entry-2"], "2026-08-23T10:30");
    expect(result).toEqual([{ ...first }, { ...second, dateInput: "2026-08-23T10:30" }]);
    expect(applyJourneyReviewBatchDateTime([first], ["entry-1"], "not-a-date")).toBeNull();
  });
});

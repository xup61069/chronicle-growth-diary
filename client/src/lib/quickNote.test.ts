import { createQuickNoteDraft, formatQuickNoteForClipboard, parseQuickNoteDraft } from "./quickNote";
import { describe, expect, it } from "vitest";

describe("quick note draft helpers", () => {
  it("parses only a valid local draft shape", () => {
    expect(parseQuickNoteDraft('{"body":"離線的想法","updatedAt":1720000000000}')).toEqual({ body: "離線的想法", updatedAt: 1720000000000 });
    expect(parseQuickNoteDraft('{"body":3}')).toBeNull();
    expect(parseQuickNoteDraft("not-json")).toBeNull();
  });

  it("round-trips typed content through the localStorage representation used after refresh", () => {
    const typedDraft = createQuickNoteDraft("在 375px 窄視窗輸入後也要保留這段想法", 1720000000000);
    const persistedValue = JSON.stringify(typedDraft);

    expect(parseQuickNoteDraft(persistedValue)).toEqual(typedDraft);
  });

  it("formats a local draft for a deliberate handoff to the editor", () => {
    const draft = createQuickNoteDraft("記下一段成長", 1720000000000);
    expect(formatQuickNoteForClipboard(draft)).toContain("# Chronicle 快速記事");
    expect(formatQuickNoteForClipboard(draft)).toContain("記下一段成長");
  });
});

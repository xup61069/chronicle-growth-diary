import { createQuickNoteDraft, formatQuickNoteForClipboard, parseQuickNoteDraft } from "./quickNote";
import { describe, expect, it } from "vitest";
import { createSharedQuickNoteFragment, mergeSharedQuickNoteDraft } from "./quickNote";

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

  it("normalizes a system share payload into a local-only draft fragment", () => {
    expect(createSharedQuickNoteFragment({ title: "散步時的想法", text: "記下今天看到的事。", url: "https://example.test/note" })).toBe("# 散步時的想法\n\n記下今天看到的事。\n\n來源：https://example.test/note");
    expect(createSharedQuickNoteFragment({ url: "javascript:alert(1)" })).toBe("");
  });

  it("appends a new system share without duplicating an existing local draft", () => {
    const existing = createQuickNoteDraft("先前的本機草稿", 1);
    const fragment = "# 分享內容\n\n只存在這個裝置";
    expect(mergeSharedQuickNoteDraft(existing, fragment, 2)).toEqual(createQuickNoteDraft("先前的本機草稿\n\n---\n\n# 分享內容\n\n只存在這個裝置", 2));
    expect(mergeSharedQuickNoteDraft(mergeSharedQuickNoteDraft(existing, fragment, 2), fragment, 3)).toEqual(mergeSharedQuickNoteDraft(existing, fragment, 2));
  });
});

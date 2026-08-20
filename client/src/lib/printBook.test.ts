import { describe, expect, it } from "vitest";
import { createPrintBookDocument } from "./printBook";

describe("A5 private print book", () => {
  const document = createPrintBookDocument({
    title: "我的 <成長史>",
    subtitle: "只留在自己的書冊",
    printedAt: new Date("2026-08-20T00:00:00.000Z"),
    phases: [{ key: "childhood", label: "童年", yearRange: "2000 — 2006", events: [
      { id: 1, occurredAt: Date.UTC(2001, 0, 2), datePrecision: "day", title: "第一張 <照片>", body: "記下 <私人> 文字", tags: [{ name: "家庭" }], media: [{ url: "https://example.test/photo.jpg", caption: "小時候" }], voiceNotes: [{ transcript: "這段逐字稿" }] },
      { id: 2, occurredAt: Date.UTC(2002, 0, 2), datePrecision: "day", title: "膠囊", body: "不應出現", unlocksAt: Date.UTC(2030, 0, 1), voiceNotes: [{ transcript: "也不應出現" }] },
    ] }],
  });

  it("uses an A5 print stylesheet and renders a user-triggered print control", () => {
    expect(document).toContain("size: A5 portrait");
    expect(document).toContain("列印／另存 PDF");
    expect(document).toContain("window.print()");
  });

  it("escapes personal text and masks both body and transcript of unopened capsules", () => {
    expect(document).toContain("我的 &lt;成長史&gt;");
    expect(document).toContain("記下 &lt;私人&gt; 文字");
    expect(document).not.toContain("不應出現");
    expect(document).not.toContain("也不應出現");
    expect(document).toContain("時空膠囊 · 未解鎖");
  });
});

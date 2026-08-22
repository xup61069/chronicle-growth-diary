import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivateHighlightAssistant } from "./PrivateHighlightAssistant";

describe("PrivateHighlightAssistant", () => {
  it("keeps the private-only consent gate disabled until AI has been explicitly enabled", () => {
    const html = renderToStaticMarkup(<PrivateHighlightAssistant aiEnabled={false} consent={false} isGenerating={false} candidates={[]} adoptingEventId={null} onConsentChange={() => undefined} onGenerate={() => undefined} onAdopt={() => undefined} />);

    expect(html).toContain("這不是自動標記");
    expect(html).toContain("不送媒體、語音、GPS、分享設定或帳號資料");
    expect(html).toContain("AI 已關閉，請先在資料控制區啟用。");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("產生精選候選");
  });

  it("renders transient candidates and an individual adoption action without sharing controls", () => {
    const html = renderToStaticMarkup(<PrivateHighlightAssistant aiEnabled consent isGenerating={false} adoptingEventId={22} onConsentChange={() => undefined} onGenerate={() => undefined} onAdopt={() => undefined} candidates={[
      { eventId: 21, title: "匿名里程碑一", reason: "private 文字片段", confidence: "high", model: "test-model" },
      { eventId: 22, title: "匿名里程碑二", reason: "private 標籤", confidence: "medium", model: "test-model" },
    ]} />);

    expect(html).toContain("重新產生候選");
    expect(html).toContain("較高依據");
    expect(html).toContain("可供參考");
    expect(html).toContain("候選只留在目前工作階段");
    expect(html).toContain("採用為精選");
    expect(html).toContain("aria-live=\"polite\"");
    expect(html).not.toContain("公開分享");
  });
});

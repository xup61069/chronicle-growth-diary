import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isMobileMenuDismissKey } from "@/lib/homeNavigation";
import Home from "./Home";

describe("Home", () => {
  it("defers non-critical story example images without changing their decorative alternative text", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect((html.match(/loading="lazy"/g) ?? [])).toHaveLength(3);
  });

  it("provides an explicit collapsed state and control relationship for the mobile navigation", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('id="primary-navigation"');
    expect(html).toContain('aria-controls="primary-navigation"');
    expect(html).toContain('aria-expanded="false"');
    expect(isMobileMenuDismissKey("Escape")).toBe(true);
    expect(isMobileMenuDismissKey("Enter")).toBe(false);
  });

  it("links the hero example entry to the story examples instead of a temporary notification", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('class="text-button" href="#stories"');
    expect(html).not.toContain("已開啟一份範例時間軸");
  });

  it("keeps a public offline quick-note entry available alongside the full editor", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('class="text-button offline-note-link" href="/quick-note" aria-describedby="offline-note-guidance"');
    expect(html).toContain("離線紀錄");
    expect(html).toContain('id="offline-note-guidance"');
    expect(html).toContain("離線草稿只保存在目前裝置；準備好後可複製並整理成正式事件。");
    expect(html).toContain('class="solid-button" href="/editor"');
  });

  it("uses direct product language and states the private-first data boundary", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("用時間軸整理");
    expect(html).toContain("集中管理日期、文字、圖片和標籤");
    expect(html).toContain("內容預設只供本人檢視");
    expect(html).toContain("再為個別事件設定分享範圍");
    expect(html).toContain("建立事件，補充資料");
    expect(html).not.toContain("留給以後的你");
    expect(html).not.toContain("再慢慢看見時間");
    expect(html).not.toContain("讓脈絡不再埋沒於訊息與試算表");
  });

  it("routes the timeboard and story examples to the editor instead of showing temporary notices", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('class="timeline-detail"');
    expect(html).toContain('>開啟工作台');
    expect(html).toContain('class="story-link" href="/editor"');
    expect(html).not.toContain("完整檔案將於後續內容管理功能中開啟");
    expect(html).not.toContain("案例詳情可連結至實際分享頁面");
  });

  it("provides a focusable, described keyboard entry point for the interactive timeline", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('id="timeboard-instruction"');
    expect(html).toContain('role="region" aria-label="互動時間帶" aria-describedby="timeboard-instruction" aria-busy="false" tabindex="0"');
    expect(html).toContain("聚焦時間帶後");
  });

  it("exposes the selected public timeline filter to assistive technology", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('aria-label="時間軸分類篩選"');
    expect(html).toContain('class="active" aria-pressed="true">全部');
    expect(html).toContain('aria-pressed="false">研究');
  });

  it("provides accessible autocomplete, date, sort, and live-result controls for the public timeline", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('id="timeline-keyword-query"');
    expect(html).toContain('type="search"');
    expect(html).toContain('aria-label="搜尋示範事件內容"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toContain('aria-controls="timeline-autocomplete-options"');
    expect(html).toContain('id="timeline-date-query"');
    expect(html).toContain('type="date"');
    expect(html).toContain('aria-label="依日期篩選示範事件"');
    expect(html).toContain('id="timeline-date-sort"');
    expect(html).toContain('aria-label="事件日期排序"');
    expect(html).toContain("由舊到新");
    expect(html).toContain("由新到舊");
    expect(html).toContain('class="timeline-result-summary" role="status" aria-live="polite"');
    expect(html).toContain("顯示 5 筆示範事件／由舊到新");
    expect(html).toContain('aria-busy="false"');
  });

  it("provides a skip link that moves keyboard focus to the main content landmark", () => {
    const html = renderToStaticMarkup(<Home />);
    const skipLinkIndex = html.indexOf('class="skip-link" href="#main-content"');
    expect(skipLinkIndex).toBeGreaterThan(-1);
    expect(skipLinkIndex).toBeLessThan(html.indexOf("<header"));
    expect(html).toContain('<main id="main-content" tabindex="-1">');
  });
});

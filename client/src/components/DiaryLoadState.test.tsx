import { DiaryLoadState } from "./DiaryLoadState";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

describe("DiaryLoadState", () => {
  it("renders a focused loading status", () => {
    const html = renderToStaticMarkup(<DiaryLoadState status="loading" />);
    expect(html).toContain("正在開啟你的成長檔案");
  });

  it("renders timeout recovery actions without hiding the cause", () => {
    const html = renderToStaticMarkup(<DiaryLoadState status="error" timedOut onRetry={vi.fn()} />);
    expect(html).toContain("讀取時間超過預期");
    expect(html).toContain("重新嘗試");
    expect(html).toContain("重新載入頁面");
  });
});

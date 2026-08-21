import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RouteLoadingState } from "../../App";

describe("RouteLoadingState", () => {
  it("provides a readable loading boundary while a non-home route chunk loads", () => {
    const html = renderToStaticMarkup(<RouteLoadingState />);
    expect(html).toContain("正在整理閱讀頁面…");
    expect(html).toContain("min-h-screen");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
  });
});

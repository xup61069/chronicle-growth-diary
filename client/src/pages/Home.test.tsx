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
});

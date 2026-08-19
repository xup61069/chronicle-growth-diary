import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "./Home";

describe("Home", () => {
  it("defers non-critical story example images without changing their decorative alternative text", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect((html.match(/loading="lazy"/g) ?? [])).toHaveLength(3);
  });
});

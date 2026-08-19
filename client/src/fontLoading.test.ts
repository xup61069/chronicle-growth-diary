import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");

describe("public font loading", () => {
  it("preconnects to Google Fonts and preserves swap rendering without a CSS import waterfall", () => {
    expect(html).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
    expect(html).toContain('rel="preconnect" href="https://fonts.gstatic.com" crossorigin');
    expect(html).toContain("DM+Serif+Display");
    expect(html).toContain("Noto+Sans+TC");
    expect(html).toContain("display=swap");
    expect(css).not.toContain("fonts.googleapis.com");
  });
});

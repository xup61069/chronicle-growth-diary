import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const indexCss = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("global navigation styles", () => {
  it("uses smooth anchor navigation while respecting reduced-motion preferences", () => {
    expect(indexCss).toContain("html { scroll-behavior: smooth; }");
    expect(indexCss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*html \{ scroll-behavior: auto; \}/);
  });

  it("removes non-essential public homepage motion for reduced-motion preferences", () => {
    expect(indexCss).toContain(".chronicle-site *, .chronicle-site *::before, .chronicle-site *::after {");
    expect(indexCss).toContain("transition-duration: .01ms !important;");
    expect(indexCss).toContain(".chronicle-site .hero-workbench:hover { transform: none; }");
    expect(indexCss).toContain(".chronicle-site .story-card:hover img { transform: none; }");
  });
});

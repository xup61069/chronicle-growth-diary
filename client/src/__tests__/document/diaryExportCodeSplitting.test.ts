import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("document export loading boundary", () => {
  it("loads screenshot and PDF libraries only from user-triggered export helpers", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/lib/diaryExport.ts"), "utf8");

    expect(source).toContain('await import("html2canvas")');
    expect(source).toContain('await import("jspdf")');
    expect(source).not.toMatch(/^import\s+.*\s+from\s+["'](?:html2canvas|jspdf)["'];?$/m);
  });
});

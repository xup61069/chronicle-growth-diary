import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production bundle boundaries", () => {
  it("keeps charts, document export and data clients in independently cacheable chunks", () => {
    const config = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
    expect(config).toContain("manualChunks(id)");
    expect(config).toContain('return "charts"');
    expect(config).toContain('return "document-export"');
    expect(config).toContain('return "data-client"');
    expect(config).toContain('return "workspace-ui"');
    expect(config).toContain('return "react-runtime"');
  });
});

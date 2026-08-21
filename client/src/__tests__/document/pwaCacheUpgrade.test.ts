import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PWA upgrade safety", () => {
  it("immediately replaces obsolete precaches so an old entry module cannot pin a blank page", () => {
    const config = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");

    expect(config).toContain('registerType: "autoUpdate"');
    expect(config).toContain("cleanupOutdatedCaches: true");
    expect(config).toContain("clientsClaim: true");
    expect(config).toContain("skipWaiting: true");
    expect(config).toContain('globIgnores: ["**/heic-to-*.js"]');
  });
});

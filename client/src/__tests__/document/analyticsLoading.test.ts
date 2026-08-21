import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("analytics loading", () => {
  it("does not emit an invalid placeholder request when analytics is not configured", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    expect(html).not.toContain('src="%VITE_ANALYTICS_ENDPOINT%/umami"');
    expect(html).toContain("import.meta.env.VITE_ANALYTICS_ENDPOINT");
    expect(html).toContain("import.meta.env.VITE_ANALYTICS_WEBSITE_ID");
    expect(html).toContain("if (analyticsEndpoint && analyticsWebsiteId)");
    expect(html).toContain('analyticsScript.src = `${analyticsEndpoint}/umami`');
  });
});

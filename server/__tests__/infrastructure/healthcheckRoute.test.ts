import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const entry = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");

describe("self-hosting health check", () => {
  it("exposes a small public health route before application middleware", () => {
    expect(entry).toContain('app.get("/healthz"');
    expect(entry).toMatch(/response\s*\.status\(200\)\s*\.json\(\{\s*version:/);
    expect(entry.indexOf('app.get("/healthz"')).toBeLessThan(entry.indexOf("registerRequestBodyParsers(app)"));
  });
});

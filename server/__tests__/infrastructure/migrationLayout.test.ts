import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Drizzle migration layout", () => {
  it("keeps SQL migrations and metadata in the single configured drizzle output directory", () => {
    const root = process.cwd();
    const config = readFileSync(resolve(root, "drizzle.config.ts"), "utf8");
    const drizzleDir = resolve(root, "drizzle");
    const files = readdirSync(drizzleDir);

    expect(config).toContain('out: "./drizzle"');
    expect(files.some((file) => /^\d{4}_.+\.sql$/.test(file))).toBe(true);
    expect(existsSync(resolve(drizzleDir, "meta", "_journal.json"))).toBe(true);
    expect(existsSync(resolve(drizzleDir, "migrations"))).toBe(false);
  });
});

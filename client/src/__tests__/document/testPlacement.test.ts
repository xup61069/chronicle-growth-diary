import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CLIENT_SOURCE = path.resolve(import.meta.dirname, "../..");

describe("frontend test placement", () => {
  it("keeps client source root free of test files", () => {
    const rootTests = readdirSync(CLIENT_SOURCE).filter(file => /\.test\.tsx?$/.test(file));

    expect(rootTests).toEqual([]);
  });

  it("keeps named entry and document test namespaces available", () => {
    expect(existsSync(path.join(CLIENT_SOURCE, "__tests__", "entry"))).toBe(true);
    expect(existsSync(path.join(CLIENT_SOURCE, "__tests__", "document"))).toBe(true);
  });
});

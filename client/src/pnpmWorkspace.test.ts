import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as Record<string, unknown>;
const pnpmWorkspace = readFileSync(resolve(process.cwd(), "pnpm-workspace.yaml"), "utf8");

describe("pnpm workspace configuration", () => {
  it("keeps patched dependencies and overrides in the pnpm workspace file", () => {
    expect(packageJson).not.toHaveProperty("pnpm");
    expect(pnpmWorkspace).toContain("packages:");
    expect(pnpmWorkspace).toContain("  - .");
    expect(pnpmWorkspace).toContain("patchedDependencies:");
    expect(pnpmWorkspace).toContain("wouter@3.7.1: patches/wouter@3.7.1.patch");
    expect(pnpmWorkspace).toContain("overrides:");
    expect(pnpmWorkspace).toContain("tailwindcss>nanoid: 3.3.7");
  });
});

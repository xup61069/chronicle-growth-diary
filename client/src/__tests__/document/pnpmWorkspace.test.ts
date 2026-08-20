import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as Record<string, unknown>;
const pnpmWorkspace = readFileSync(resolve(process.cwd(), "pnpm-workspace.yaml"), "utf8");

describe("pnpm workspace configuration", () => {
  it("keeps the workspace root and the pnpm 10-compatible patch configuration", () => {
    const pnpm = packageJson.pnpm as { overrides?: Record<string, string>; patchedDependencies?: Record<string, string> };
    expect(packageJson).toHaveProperty("pnpm.overrides.tailwindcss>nanoid", "3.3.7");
    expect(pnpm.patchedDependencies?.["wouter@3.7.1"]).toBe("patches/wouter@3.7.1.patch");
    expect(packageJson).toHaveProperty("packageManager");
    expect(pnpmWorkspace).toContain("packages:");
    expect(pnpmWorkspace).toContain("  - .");
    expect(pnpmWorkspace).not.toContain("patchedDependencies:");
    expect(pnpmWorkspace).not.toContain("overrides:");
  });
});

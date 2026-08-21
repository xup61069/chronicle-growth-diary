import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as Record<string, unknown>;
const pnpmWorkspace = readFileSync(resolve(process.cwd(), "pnpm-workspace.yaml"), "utf8");

describe("pnpm workspace configuration", () => {
  it("keeps the workspace root and the pnpm 10-compatible patch configuration", () => {
    expect(packageJson).toHaveProperty("packageManager");
    expect(packageJson).not.toHaveProperty("pnpm");
    expect(pnpmWorkspace).toContain("packages:");
    expect(pnpmWorkspace).toContain("  - .");
    expect(pnpmWorkspace).toContain("overrides:\n  tailwindcss>nanoid: 3.3.7");
    expect(pnpmWorkspace).toContain("patchedDependencies:\n  wouter@3.7.1: patches/wouter@3.7.1.patch");
  });
});

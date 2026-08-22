import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../../..");

describe("CI regression protection", () => {
  it("runs mock OAuth HTTP and browser callback regressions plus the lazy route verifier explicitly", () => {
    const workflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
    expect(workflow).toContain("pnpm test:e2e:oauth-mock");
    expect(workflow).toContain("pnpm test:e2e:oauth-mock-browser");
    expect(workflow).toContain("Install Chromium");
    expect(workflow).toContain("pnpm verify:lazy-routes");
    expect(workflow).toContain("Build production bundle");
  });

  it("keeps lazy route verification inside the production build contract", () => {
    const packageJson = readFileSync(resolve(root, "package.json"), "utf8");
    expect(packageJson).toMatch(/"build":\s*"vite build && pnpm verify:lazy-routes/);
  });

  it("runs the same untrusted-code-safe validation workflow for dependent pull requests", () => {
    const workflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
    expect(workflow).toMatch(/pull_request:\s*\n\s*\npermissions:/);
    expect(workflow).not.toMatch(/pull_request:\s*\n\s+branches:/);
    expect(workflow).toContain("contents: read");
  });
});

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("portable self-hosting assets", () => {
  it("keeps the self-host image outside the managed deployment Dockerfile path", () => {
    expect(existsSync(resolve(root, "Dockerfile"))).toBe(false);
    const dockerfile = read("docker/Dockerfile");
    expect(dockerfile).toContain("FROM node:22-alpine AS deps");
    expect(dockerfile).toContain("USER chronicle");
    expect(dockerfile).toContain('ENTRYPOINT ["/usr/local/bin/chronicle-entrypoint"]');
    expect(dockerfile).toContain('CMD ["node", "dist/index.js"]');
  });

  it("builds the portable image in CI without publishing and probes only healthz", () => {
    const workflow = read(".github/workflows/ci.yml");
    const compose = read("docker-compose.example.yml");
    expect(workflow).toContain("docker build --file docker/Dockerfile --tag chronicle-selfhost:ci .");
    expect(workflow).not.toContain("docker push");
    expect(compose).toContain("dockerfile: docker/Dockerfile");
    expect(compose).toContain("/healthz");
    expect(compose).not.toContain(":latest");
    expect(compose).toContain("CHRONICLE_RUN_MIGRATIONS");
    expect(compose).not.toContain("JWT_SECRET: change-me");
  });
});

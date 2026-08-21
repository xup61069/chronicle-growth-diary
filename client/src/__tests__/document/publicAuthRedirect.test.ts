import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const main = readFileSync(resolve(process.cwd(), "client/src/main.tsx"), "utf8");
const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("public authentication routing", () => {
  it("keeps the homepage public instead of globally redirecting an anonymous auth.me query to OAuth", () => {
    expect(app).toContain('<Route path="/" component={Home} />');
    expect(main).not.toContain("redirectToLoginIfUnauthorized");
    expect(main).not.toContain('import { startLogin } from "./const"');
    expect(main).toContain("Public routes read `auth.me`");
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("lazy route chunk safety", () => {
  it("keeps private workspace routes lazy and excludes the unsafe Recharts shared chunk", () => {
    const routes = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const viteConfig = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");

    for (const route of ["DiaryEditor", "FamilyInvite", "GrowthDashboard", "QuickNote", "SharedStory", "NotFound"]) {
      expect(routes).toContain(`lazy(() => import("@/pages/${route}"))`);
    }
    expect(viteConfig).not.toContain('return "charts"');
  });
});

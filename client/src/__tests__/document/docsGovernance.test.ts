import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../../..");

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("documentation governance", () => {
  it("keeps todo.md as a compact pointer instead of a duplicated work log", () => {
    const todo = readProjectFile("todo.md");
    expect(todo.length).toBeLessThan(1_200);
    expect(todo).toContain("docs/roadmap/CURRENT_SPRINT.md");
    expect(todo).toContain("docs/AI_HANDOFF.md");
    expect(todo).not.toContain("## Blocked — external OAuth");
  });

  it("provides a docs index and directs agents to the roadmap rather than historical TODO entries", () => {
    const docsIndex = readProjectFile("docs/README.md");
    const agents = readProjectFile("AGENTS.md");
    expect(docsIndex).toContain("AI_HANDOFF.md");
    expect(docsIndex).toContain("TESTING.md");
    expect(docsIndex).toContain("roadmap/CURRENT_SPRINT.md");
    expect(agents).toContain("禁止");
    expect(agents).toContain("docs/roadmap/CURRENT_SPRINT.md");
    expect(agents).toMatch(/todo\.md`?\s*只保留指針/);
  });

  it("keeps archive recovery, bilingual README review, and supply-chain checks discoverable", () => {
    const chineseReadme = readProjectFile("README.md");
    const englishReadme = readProjectFile("README.en.md");
    const contributing = readProjectFile("CONTRIBUTING.md");
    const template = readProjectFile(".github/pull_request_template.md");
    const selfHosting = readProjectFile("docs/SELF_HOSTING.md");

    expect(chineseReadme).toContain("全量封存與還原");
    expect(englishReadme).toContain("Full archive and restore");
    expect(chineseReadme).toContain("pnpm verify:secrets");
    expect(englishReadme).toContain("pnpm audit:prod");
    expect(contributing).toContain("README.en.md");
    expect(template).toContain("README 雙語同步");
    expect(selfHosting).toContain("全量封存 ZIP 的從零演練");
    expect(selfHosting).toContain("還原我的成長史");
  });
});

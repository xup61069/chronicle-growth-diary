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
});

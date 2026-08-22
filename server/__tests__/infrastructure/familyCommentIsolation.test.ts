import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");

describe("family comment isolation contract", () => {
  it("keeps private event comments out of public/link sharing, AI input, and portable archive projections", () => {
    const sharing = readFileSync(resolve(root, "server/db/sharing.ts"), "utf8");
    const highlights = readFileSync(resolve(root, "server/db/aiHighlights.ts"), "utf8");
    const archive = readFileSync(resolve(root, "server/db/fullDiaryArchive.ts"), "utf8");

    for (const projection of [sharing, highlights, archive]) {
      expect(projection).not.toContain("growthEventComments");
      expect(projection).not.toContain("getEventComments");
      expect(projection).not.toContain("growth_event_comments");
    }
  });
});

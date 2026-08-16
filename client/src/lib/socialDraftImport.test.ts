import { describe, expect, it } from "vitest";
import { parseSocialDraftJson } from "./socialDraftImport";

describe("social draft import", () => {
  it("parses Plurk-compatible posts locally, removes duplicates, and flags meaningful candidates", () => {
    const candidates = parseSocialDraftJson(JSON.stringify({ plurks: [
      { plurk_id: 7, posted: "2024-05-01T12:00:00Z", content_raw: "今天終於畢業了，謝謝一路陪伴我的人。" },
      { plurk_id: 7, posted: "2024-05-01T12:00:00Z", content_raw: "重複資料" },
    ] }));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ sourceId: "7", isSignificant: true });
  });
});

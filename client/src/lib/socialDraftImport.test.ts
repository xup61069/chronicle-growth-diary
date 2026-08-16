import { describe, expect, it } from "vitest";
import { parseSocialDraftCsv, parseSocialDraftJson } from "./socialDraftImport";

describe("social draft import", () => {
  it("parses Plurk-compatible posts locally, removes duplicates, and flags meaningful candidates", () => {
    const candidates = parseSocialDraftJson(JSON.stringify({ plurks: [
      { plurk_id: 7, posted: "2024-05-01T12:00:00Z", content_raw: "今天終於畢業了，謝謝一路陪伴我的人。" },
      { plurk_id: 7, posted: "2024-05-01T12:00:00Z", content_raw: "重複資料" },
    ] }));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ sourceId: "7", isSignificant: true });
  });

  it("parses a local CSV export with standard date and content columns", () => {
    const candidates = parseSocialDraftCsv("id,posted,content\n8,2024-05-02T12:00:00Z,完成第一次公開演講");
    expect(candidates[0]).toMatchObject({ sourceId: "8", title: "完成第一次公開演講" });
  });

  it("keeps quoted commas and line breaks inside a CSV post body", () => {
    const candidates = parseSocialDraftCsv('id,posted,content\n9,2024-05-03T12:00:00Z,"今天記下：逗號, 還有第二行\n並保留"');
    expect(candidates[0]?.body).toBe("今天記下：逗號, 還有第二行 並保留");
  });
});

import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { readDayOneImport } from "./dayOneImport";

function jsonFile(value: unknown, name = "Journal.json") {
  return new File([JSON.stringify(value)], name, { type: "application/json" });
}

describe("Day One private import", () => {
  it("keeps only reviewed date, plain text and bounded tags from JSON", async () => {
    const preview = await readDayOneImport(jsonFile({ entries: [{
      uuid: "entry-one", creationDate: "2025-03-01T09:30:00Z", text: "第一天的記錄\n保留第二行", tags: ["旅行", "私密", "這是一個明確超過二十四個中文字限制且不應保留的長標籤內容"],
      photos: [{ path: "photos/private.jpg" }], location: { latitude: 25.03, longitude: 121.56 }, weather: { temperature: 24 }, richText: "<p>ignore</p>",
    }] }));
    expect(preview).toMatchObject({ sourceKind: "json", skippedCount: 0, duplicateCount: 0, candidates: [{ sourceId: "entry-one", title: "第一天的記錄", body: "第一天的記錄\n保留第二行", tagNames: ["Day One 匯入", "旅行", "私密"] }] });
    expect(JSON.stringify(preview)).not.toContain("location");
    expect(JSON.stringify(preview)).not.toContain("photos");
  });

  it("reads the unique root Journal.json from a ZIP and ignores media files", async () => {
    const zip = new JSZip();
    zip.file("Journal.json", JSON.stringify({ entries: [{ uuid: "zip-entry", creationDate: "2024-01-02T00:00:00Z", text: "ZIP 記錄", tags: [] }] }));
    zip.file("photos/original.jpg", "raw private photo bytes");
    const blob = await zip.generateAsync({ type: "blob" });
    const preview = await readDayOneImport(new File([blob], "day-one.zip", { type: "application/zip" }));
    expect(preview).toMatchObject({ sourceKind: "zip", candidates: [{ sourceId: "zip-entry", title: "ZIP 記錄", tagNames: ["Day One 匯入"] }] });
  });

  it("skips invalid rows and deduplicates repeated source UUIDs without persisting them", async () => {
    const preview = await readDayOneImport(jsonFile({ entries: [
      { uuid: "same", creationDate: "2025-01-01T00:00:00Z", text: "first" },
      { uuid: "same", creationDate: "2025-01-02T00:00:00Z", text: "second" },
      { uuid: "broken", creationDate: "not-a-date", text: "invalid" },
    ] }));
    expect(preview.candidates).toHaveLength(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.skippedCount).toBe(1);
  });
});

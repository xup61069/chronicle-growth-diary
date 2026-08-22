import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { readJourneyImport } from "./journeyImport";

async function journeyZip(entries: Record<string, unknown>, extra: Record<string, string> = {}) {
  const zip = new JSZip();
  Object.entries(entries).forEach(([name, value]) => zip.file(name, JSON.stringify(value)));
  Object.entries(extra).forEach(([name, value]) => zip.file(name, value));
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "journey-backup.zip", { type: "application/zip" });
}

describe("Journey private import", () => {
  it("keeps only date, sanitized plain text and bounded tags from safe JSON entries at any ZIP path", async () => {
    const preview = await readJourneyImport(await journeyZip({
      "entries/entry-one.json": { id: "provider-entry-one", date_journal: 1_741_381_000_000, text: "<h1>Journey 記事</h1><p>保留文字</p>", tags: ["旅行", "私人", "這是一段長度明確超過二十四個字元且絕不應匯入的私有標籤"], lat: 25.03, lon: 121.56, address: "不應保留", weather: { degree_c: 24 }, photos: ["private.jpg"], timezone: "Asia/Taipei" },
    }, { "photos/private.jpg": "raw private bytes" }));
    expect(preview).toMatchObject({ skippedCount: 0, duplicateCount: 0, candidates: [{ sourceId: "provider-entry-one", title: "Journey 記事", body: "Journey 記事\n保留文字", tagNames: ["Journey 匯入", "旅行", "私人"] }] });
    expect(JSON.stringify(preview)).not.toContain("address");
    expect(JSON.stringify(preview)).not.toContain("private.jpg");
    expect(JSON.stringify(preview)).not.toContain("25.03");
  });

  it("skips unknown shapes and prioritizes provider id before date plus sanitized text for local deduplication", async () => {
    const preview = await readJourneyImport(await journeyZip({
      "first.json": { id: "same-provider-id", date_journal: 1_704_067_200_000, text: "相同資料", tags: ["測試"] },
      "second.json": { id: "same-provider-id", date_journal: 1_704_067_200_001, text: "不同正文", tags: ["測試"] },
      "third.json": { date_journal: 1_704_067_200_000, text: "相同資料", tags: ["不同標籤"] },
      "fourth.json": { date_journal: 1_704_067_200_000, text: "相同資料", tags: ["另一個標籤"] },
      "broken.json": { date_journal: "not-a-time", text: "忽略" },
      "metadata.json": { version: 1 },
    }));
    expect(preview.candidates).toHaveLength(2);
    expect(preview.duplicateCount).toBe(2);
    expect(preview.skippedCount).toBe(2);
  });

  it("rejects a direct JSON file because Journey review only accepts its ZIP export", async () => {
    await expect(readJourneyImport(new File(["{}"], "entry.json", { type: "application/json" }))).rejects.toThrow("原始 ZIP");
  });
});

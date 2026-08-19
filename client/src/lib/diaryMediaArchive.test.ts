import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaArchive, readMediaArchive } from "./diaryMediaArchive";

describe("Chronicle 媒體 ZIP 封存", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("只將已下載的受支援圖片、事件指紋與說明打包後安全讀回", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["image-bytes"], { type: "image/png" }), { status: 200 })));
    const archive = await createMediaArchive([{ title: "第一次上台", occurredAt: 1_704_067_200_000, media: [{ url: "https://example.invalid/photo.png", fileName: "stage photo.png", mimeType: "image/png", caption: "舞台燈光", sortOrder: 0 }] }], "2026-08-19T00:00:00.000Z");
    const restored = await readMediaArchive(archive.blob);
    expect(archive.itemCount).toBe(1);
    expect(restored.items).toHaveLength(1);
    expect(restored.items[0]).toMatchObject({ eventIndex: 0, eventTitle: "第一次上台", occurredAt: 1_704_067_200_000, caption: "舞台燈光" });
    expect(restored.items[0]?.file.type).toBe("image/png");
  });

  it("拒絕 manifest 中非 media 目錄的危險路徑", async () => {
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify({ format: "chronicle-media-archive", version: 1, eventCount: 1, items: [{ eventIndex: 0, eventTitle: "測試", occurredAt: 1, entry: "../secret.png", fileName: "secret.png", mimeType: "image/png", caption: null, sortOrder: 0 }] }));
    zip.file("../secret.png", "image-bytes");
    await expect(readMediaArchive(await zip.generateAsync({ type: "blob" }))).rejects.toThrow("媒體描述格式無效");
  });
});

import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFullDiaryArchive, readFullDiaryArchive } from "./fullDiaryArchive";

const source = {
  data: {
    format: "chronicle-growth-diary-full",
    version: 1,
    diary: { title: "家庭成長紀錄", publicCoverAssetId: null },
    events: [{ archiveId: "event-1", title: "第一個作品", media: [{ assetId: "event-1-media-1", fileName: "stage.png" }] }],
    reflections: [],
    revisions: [],
    exclusions: ["分享 token"],
  },
  assets: [{ id: "event-1-media-1", kind: "image" as const, sourceUrl: "https://private.example.test/stage.png", fileName: "stage photo.png", mimeType: "image/png" }],
};

describe("Chronicle 全量資料封存", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("產生可驗證的資料加附件 ZIP，且 payload 不包含來源 URL 或 storage 機密", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["image-bytes"], { type: "image/png" }), { status: 200 })));
    const archive = await createFullDiaryArchive(source, "2026-08-22T00:00:00.000Z");
    const restored = await readFullDiaryArchive(archive.blob);
    const zip = await JSZip.loadAsync(await archive.blob.arrayBuffer());
    const payload = await zip.file("data/chronicle-full.json")?.async("text");

    expect(archive).toMatchObject({ assetCount: 1, eventCount: 1 });
    expect(restored).toMatchObject({ assetCount: 1, data: { format: "chronicle-growth-diary-full", version: 1 } });
    expect(payload).toContain("event-1-media-1");
    expect(payload).not.toContain("private.example.test");
    expect(payload).not.toContain("storageKey");
    expect(archive.manifest.assets[0]).toMatchObject({ path: "assets/001-stage-photo.png", byteLength: 11 });
    expect(archive.manifest.payload.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(restored.assets[0]).toMatchObject({ id: "event-1-media-1", fileName: "stage-photo.png", byteLength: 11 });
    await expect(restored.assets[0]?.blob.text()).resolves.toBe("image-bytes");
  });

  it("在準備、逐項附件讀取、封裝與完成時回報不偽造的封存進度", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["image-bytes"], { type: "image/png" }), { status: 200 })));
    const progress: string[] = [];
    await createFullDiaryArchive(source, "2026-08-22T00:00:00.000Z", (item) => progress.push(`${item.stage}:${item.completed}/${item.total}`));
    expect(progress).toEqual(["preparing:0/1", "reading-assets:0/1", "reading-assets:1/1", "packaging:1/1", "complete:1/1"]);
  });

  it("拒絕有分享憑證或來源 URL 的資料 payload，避免建立不安全的封存", async () => {
    await expect(createFullDiaryArchive({ ...source, data: { ...source.data, shareTokenHash: "must-not-export" } })).rejects.toThrow("不應攜出的私密欄位");
    await expect(createFullDiaryArchive({ ...source, data: { ...source.data, sourceUrl: "https://private.example.test" } })).rejects.toThrow("不應攜出的私密欄位");
  });

  it("拒絕資料 payload checksum 被竄改的封存", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["image-bytes"], { type: "image/png" }), { status: 200 })));
    const archive = await createFullDiaryArchive(source, "2026-08-22T00:00:00.000Z");
    const zip = await JSZip.loadAsync(await archive.blob.arrayBuffer());
    zip.file("data/chronicle-full.json", JSON.stringify({ format: "chronicle-growth-diary-full", version: 1, events: [] }));

    await expect(readFullDiaryArchive(await zip.generateAsync({ type: "blob" }))).rejects.toThrow("完整性驗證失敗");
  });
});

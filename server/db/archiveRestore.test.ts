import { describe, expect, it } from "vitest";
import { buildFullArchiveRestoreAttachmentRows, fullArchiveRestoreInput } from "./archiveRestore";

const input = fullArchiveRestoreInput.parse({
  data: {
    format: "chronicle-growth-diary-full",
    version: 1,
    diary: { title: "家庭成長史", publicCoverAssetId: null },
    tags: [],
    events: [{
      archiveId: "event-1", occurredAt: 1_700_000_000_000, datePrecision: "day", eventType: "memory", title: "第一次旅行", body: "記下路上的事。",
      media: [{ assetId: "event-1-media-1", mediaKind: "image", fileName: "trip.jpg", mimeType: "image/jpeg", caption: null, sortOrder: 0 }],
      voiceNotes: [],
    }],
    reflections: [],
    revisions: [],
  },
  assets: [{ id: "event-1-media-1", kind: "image", fileName: "trip.jpg", mimeType: "image/jpeg", byteLength: 9, sha256: "a".repeat(64) }],
});

describe("全量封存還原附件契約", () => {
  it("只建立與已驗證事件媒體一對一對應的 private staging 描述", () => {
    expect(buildFullArchiveRestoreAttachmentRows(input)).toEqual([
      expect.objectContaining({ assetId: "event-1-media-1", eventArchiveId: "event-1", byteLength: 9, sha256: "a".repeat(64), kind: "image" }),
    ]);
  });

  it("拒絕不屬於事件或封面的未指派附件", () => {
    const unsafe = fullArchiveRestoreInput.parse({ ...input, assets: [...input.assets, { id: "orphan-asset", kind: "image", fileName: "orphan.jpg", mimeType: "image/jpeg", byteLength: 1, sha256: "b".repeat(64) }] });
    expect(() => buildFullArchiveRestoreAttachmentRows(unsafe)).toThrow("未指派");
  });
});

import { describe, expect, it } from "vitest";
import { findPhotoImportDuplicateCandidates, photoImportSourceKey, readPhotoImportChecksums } from "./photoImportDedupe";

function localFile(name: string, size: number, lastModified = 1, type = "image/jpeg") {
  return { name, size, lastModified, type, arrayBuffer: async () => new ArrayBuffer(0) } as File;
}

describe("photo import local duplicate candidates", () => {
  it("uses only local file metadata for a reversible source-key candidate", () => {
    const first = localFile(" Family.JPG ", 12, 8);
    const second = localFile("family.jpg", 12, 8);
    expect(photoImportSourceKey(first)).toBe(photoImportSourceKey(second));
    expect(findPhotoImportDuplicateCandidates([{ id: "one", file: first }, { id: "two", file: second }])).toEqual([{ id: "one|two", photoIds: ["one", "two"], reasons: ["source_key"] }]);
  });

  it("adds checksum confidence only after a local reader is explicitly invoked and ignores unreadable files", async () => {
    const photos = [{ id: "one", file: localFile("a.jpg", 1) }, { id: "two", file: localFile("b.jpg", 2) }, { id: "bad", file: localFile("bad.jpg", 3) }];
    const checksums = await readPhotoImportChecksums(photos, async (file) => {
      if (file.name === "bad.jpg") throw new Error("unreadable");
      return "same-local-sha";
    });
    expect(checksums).toEqual([{ photoId: "one", checksum: "same-local-sha" }, { photoId: "two", checksum: "same-local-sha" }]);
    expect(findPhotoImportDuplicateCandidates(photos, checksums)).toEqual([{ id: "one|two", photoIds: ["one", "two"], reasons: ["checksum"] }]);
  });
});

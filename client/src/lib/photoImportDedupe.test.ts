import { describe, expect, it } from "vitest";
import { findPhotoImportDuplicateCandidates, hammingDistance, photoImportSourceKey, readPhotoImportChecksums, readPhotoImportPerceptualHashes } from "./photoImportDedupe";

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

  it("adds local dHash candidates only from an explicit reader and omits unsupported files", async () => {
    const photos = [{ id: "one", file: localFile("first.jpg", 1) }, { id: "two", file: localFile("second.jpg", 2) }, { id: "bad", file: localFile("bad.heic", 3, 1, "image/heic") }];
    const hashes = await readPhotoImportPerceptualHashes(photos, async (file) => {
      if (file.name === "bad.heic") throw new Error("unsupported");
      return file.name === "first.jpg" ? "00000000" : "00000100";
    });
    expect(hashes).toEqual([{ photoId: "one", hash: "00000000" }, { photoId: "two", hash: "00000100" }]);
    expect(hammingDistance("00000000", "00000100")).toBe(1);
    expect(hammingDistance("0", "00")).toBe(Number.POSITIVE_INFINITY);
    expect(findPhotoImportDuplicateCandidates(photos, [], hashes)).toEqual([{ id: "one|two", photoIds: ["one", "two"], reasons: ["dhash"] }]);
  });
});

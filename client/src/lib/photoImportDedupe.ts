export type LocalPhotoFile = Pick<File, "name" | "size" | "type" | "lastModified" | "arrayBuffer">;

export type LocalPhotoCandidate = {
  id: string;
  file: LocalPhotoFile;
};

export type PhotoImportDuplicateCandidate = {
  id: string;
  photoIds: string[];
  reasons: Array<"source_key" | "checksum">;
};

export type PhotoChecksumResult = {
  photoId: string;
  checksum: string;
};

function normalizeFileName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function photoImportSourceKey(file: Pick<LocalPhotoFile, "name" | "size" | "type" | "lastModified">) {
  return [normalizeFileName(file.name), file.size, file.lastModified, file.type.trim().toLocaleLowerCase()].join("|");
}

function candidateKey(photoIds: string[]) {
  return [...photoIds].sort().join("|");
}

function groupsFromValues(values: Array<{ photoId: string; value: string }>) {
  const grouped = new Map<string, string[]>();
  for (const { photoId, value } of values) grouped.set(value, [...(grouped.get(value) ?? []), photoId]);
  return Array.from(grouped.values()).filter((photoIds) => photoIds.length > 1).map((photoIds) => [...photoIds].sort());
}

export function findPhotoImportDuplicateCandidates(photos: LocalPhotoCandidate[], checksums: PhotoChecksumResult[] = []): PhotoImportDuplicateCandidate[] {
  const byCandidate = new Map<string, PhotoImportDuplicateCandidate>();
  const add = (photoIds: string[], reason: PhotoImportDuplicateCandidate["reasons"][number]) => {
    const id = candidateKey(photoIds);
    const current = byCandidate.get(id);
    if (current) current.reasons.push(reason);
    else byCandidate.set(id, { id, photoIds, reasons: [reason] });
  };
  for (const photoIds of groupsFromValues(photos.map((photo) => ({ photoId: photo.id, value: photoImportSourceKey(photo.file) })))) add(photoIds, "source_key");
  for (const photoIds of groupsFromValues(checksums.map((item) => ({ photoId: item.photoId, value: item.checksum })))) add(photoIds, "checksum");
  return Array.from(byCandidate.values()).sort((left, right) => left.id.localeCompare(right.id));
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function sha256PhotoChecksum(file: LocalPhotoFile) {
  if (!globalThis.crypto?.subtle) throw new Error("目前瀏覽器不支援本機 SHA-256 檢查。");
  return hex(await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
}

export async function readPhotoImportChecksums(photos: LocalPhotoCandidate[], checksum: (file: LocalPhotoFile) => Promise<string> = sha256PhotoChecksum): Promise<PhotoChecksumResult[]> {
  const results: PhotoChecksumResult[] = [];
  for (const photo of photos) {
    try {
      results.push({ photoId: photo.id, checksum: await checksum(photo.file) });
    } catch {
      // A single unreadable local file must not block review or create a remote fallback.
    }
  }
  return results;
}

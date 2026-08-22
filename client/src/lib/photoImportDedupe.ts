export type LocalPhotoFile = Pick<File, "name" | "size" | "type" | "lastModified" | "arrayBuffer">;

export type LocalPhotoCandidate = {
  id: string;
  file: LocalPhotoFile;
};

export type PhotoImportDuplicateCandidate = {
  id: string;
  photoIds: string[];
  reasons: Array<"source_key" | "checksum" | "dhash">;
};

export type PhotoChecksumResult = {
  photoId: string;
  checksum: string;
};

export type PhotoPerceptualHashResult = {
  photoId: string;
  hash: string;
};

export const MAX_LOCAL_DHASH_DISTANCE = 8;

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

export function hammingDistance(left: string, right: string) {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  return Array.from(left).reduce((distance, bit, index) => distance + Number(bit !== right[index]), 0);
}

export function findPhotoImportDuplicateCandidates(photos: LocalPhotoCandidate[], checksums: PhotoChecksumResult[] = [], perceptualHashes: PhotoPerceptualHashResult[] = []): PhotoImportDuplicateCandidate[] {
  const byCandidate = new Map<string, PhotoImportDuplicateCandidate>();
  const add = (photoIds: string[], reason: PhotoImportDuplicateCandidate["reasons"][number]) => {
    const id = candidateKey(photoIds);
    const current = byCandidate.get(id);
    if (current) current.reasons.push(reason);
    else byCandidate.set(id, { id, photoIds, reasons: [reason] });
  };
  for (const photoIds of groupsFromValues(photos.map((photo) => ({ photoId: photo.id, value: photoImportSourceKey(photo.file) })))) add(photoIds, "source_key");
  for (const photoIds of groupsFromValues(checksums.map((item) => ({ photoId: item.photoId, value: item.checksum })))) add(photoIds, "checksum");
  for (let index = 0; index < perceptualHashes.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < perceptualHashes.length; nextIndex += 1) {
      const current = perceptualHashes[index];
      const next = perceptualHashes[nextIndex];
      if (current && next && hammingDistance(current.hash, next.hash) <= MAX_LOCAL_DHASH_DISTANCE) add([current.photoId, next.photoId], "dhash");
    }
  }
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

function grayscale(data: Uint8ClampedArray, pixelOffset: number) {
  return (data[pixelOffset] * 299 + data[pixelOffset + 1] * 587 + data[pixelOffset + 2] * 114) / 1000;
}

export async function dHashPhoto(file: LocalPhotoFile) {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") throw new Error("目前瀏覽器不支援本機 dHash 檢查。");
  const bitmap = await createImageBitmap(file as unknown as Blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("目前瀏覽器無法建立本機 dHash 畫布。");
    context.drawImage(bitmap, 0, 0, 9, 8);
    const pixels = context.getImageData(0, 0, 9, 8).data;
    let hash = "";
    for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) {
      const rowOffset = y * 9;
      hash += grayscale(pixels, (rowOffset + x) * 4) > grayscale(pixels, (rowOffset + x + 1) * 4) ? "1" : "0";
    }
    return hash;
  } finally {
    bitmap.close();
  }
}

export async function readPhotoImportPerceptualHashes(photos: LocalPhotoCandidate[], hash: (file: LocalPhotoFile) => Promise<string> = dHashPhoto): Promise<PhotoPerceptualHashResult[]> {
  const results: PhotoPerceptualHashResult[] = [];
  for (const photo of photos) {
    try {
      results.push({ photoId: photo.id, hash: await hash(photo.file) });
    } catch {
      // Unsupported local decoders, including some HEIC/HEIF files, only omit this signal.
    }
  }
  return results;
}

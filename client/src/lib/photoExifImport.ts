export const MAX_EXIF_IMPORT_FILES = 24;
export const MAX_EXIF_IMPORT_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_EXIF_IMPORT_IMAGES_PER_EVENT = 8;

export type PhotoExifFile = Pick<File, "name" | "type" | "size">;
export type ExifDateReader = (file: File) => Promise<Date | string | null | undefined>;
export type PhotoCaptureSource = "exif" | "manual";

export type PhotoExifImportCandidate = {
  id: string;
  file: File;
  capturedAt: string;
  source: PhotoCaptureSource;
};

export type PhotoExifImportGroup = {
  id: string;
  date: string;
  occurredAt: number;
  title: string;
  files: File[];
  photoIds: string[];
};

export type PhotoExifImportPreview = {
  photos: PhotoExifImportCandidate[];
  groups: PhotoExifImportGroup[];
  skipped: Array<{ name: string; reason: string }>;
};

function toLocalDateTimeInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function dateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
}

export function isValidCapturedAt(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

export function buildPhotoExifImportGroups(photos: PhotoExifImportCandidate[]): PhotoExifImportGroup[] {
  const byDate = new Map<string, PhotoExifImportCandidate[]>();
  for (const photo of photos) {
    if (!isValidCapturedAt(photo.capturedAt)) continue;
    const date = photo.capturedAt.slice(0, 10);
    byDate.set(date, [...(byDate.get(date) ?? []), photo]);
  }

  return Array.from(byDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([date, matchedPhotos]) => {
      const chronological = [...matchedPhotos].sort((left, right) => left.capturedAt.localeCompare(right.capturedAt));
      const chunks = Array.from({ length: Math.ceil(chronological.length / MAX_EXIF_IMPORT_IMAGES_PER_EVENT) }, (_, index) => chronological.slice(index * MAX_EXIF_IMPORT_IMAGES_PER_EVENT, (index + 1) * MAX_EXIF_IMPORT_IMAGES_PER_EVENT));
      return chunks.map((chunk, index) => ({
        id: `${date}-${index + 1}`,
        date,
        occurredAt: new Date(chunk[0].capturedAt).getTime(),
        title: `照片記錄：${dateLabel(date)}${chunks.length > 1 ? `（第 ${index + 1} 批）` : ""}`,
        files: chunk.map((photo) => photo.file),
        photoIds: chunk.map((photo) => photo.id),
      }));
    });
}

export function updatePhotoCapturedAt(preview: PhotoExifImportPreview, photoId: string, capturedAt: string): PhotoExifImportPreview {
  const photos = preview.photos.map((photo) => photo.id === photoId ? { ...photo, capturedAt, source: "manual" as const } : photo);
  return { ...preview, photos, groups: buildPhotoExifImportGroups(photos) };
}

/** Reads only DateTimeOriginal/CreateDate in the browser. GPS and other metadata are never requested. */
export async function readPhotoCapturedAt(file: File): Promise<Date | string | null | undefined> {
  const { default: exifr } = await import("exifr/dist/full.esm.mjs");
  const metadata = await exifr.parse(await file.arrayBuffer(), ["DateTimeOriginal", "CreateDate"]);
  return metadata?.DateTimeOriginal ?? metadata?.CreateDate;
}

export async function preparePhotoExifImport(files: File[], readCapturedAt: ExifDateReader = readPhotoCapturedAt): Promise<PhotoExifImportPreview> {
  const skipped: PhotoExifImportPreview["skipped"] = [];
  const accepted = files.slice(0, MAX_EXIF_IMPORT_FILES);
  if (files.length > accepted.length) skipped.push(...files.slice(MAX_EXIF_IMPORT_FILES).map((file) => ({ name: file.name, reason: `每次最多選取 ${MAX_EXIF_IMPORT_FILES} 張照片` })));
  const photos: PhotoExifImportCandidate[] = [];

  for (let index = 0; index < accepted.length; index += 1) {
    const file = accepted[index];
    if (file.type !== "image/jpeg") {
      skipped.push({ name: file.name, reason: "目前只讀取 JPEG 的拍攝日期" });
      continue;
    }
    if (file.size > MAX_EXIF_IMPORT_FILE_BYTES) {
      skipped.push({ name: file.name, reason: "單張照片超過 4MB" });
      continue;
    }

    let capturedAt = "";
    try {
      capturedAt = toLocalDateTimeInput(await readCapturedAt(file));
    } catch {
      capturedAt = "";
    }
    photos.push({ id: `${index}-${file.name}`, file, capturedAt, source: capturedAt ? "exif" : "manual" });
  }

  return { photos, groups: buildPhotoExifImportGroups(photos), skipped };
}

export const MAX_EXIF_IMPORT_FILES = 24;
export const MAX_EXIF_IMPORT_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_EXIF_IMPORT_IMAGES_PER_EVENT = 8;

export type PhotoExifFile = Pick<File, "name" | "type" | "size">;
export type ExifDateReader = (file: File) => Promise<Date | string | null | undefined>;

export type PhotoExifImportGroup = {
  id: string;
  date: string;
  title: string;
  files: File[];
};

export type PhotoExifImportPreview = {
  groups: PhotoExifImportGroup[];
  skipped: Array<{ name: string; reason: string }>;
};

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
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
  const byDate = new Map<string, File[]>();

  for (const file of accepted) {
    if (file.type !== "image/jpeg") {
      skipped.push({ name: file.name, reason: "目前只讀取 JPEG 的拍攝日期" });
      continue;
    }
    if (file.size > MAX_EXIF_IMPORT_FILE_BYTES) {
      skipped.push({ name: file.name, reason: "單張照片超過 4MB" });
      continue;
    }
    try {
      const date = toDateInput(await readCapturedAt(file));
      if (!date) {
        skipped.push({ name: file.name, reason: "找不到可用的拍攝日期" });
        continue;
      }
      byDate.set(date, [...(byDate.get(date) ?? []), file]);
    } catch {
      skipped.push({ name: file.name, reason: "無法讀取拍攝日期" });
    }
  }

  const groups = Array.from(byDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([date, matchedFiles]) => {
      const chunks = Array.from({ length: Math.ceil(matchedFiles.length / MAX_EXIF_IMPORT_IMAGES_PER_EVENT) }, (_, index) => matchedFiles.slice(index * MAX_EXIF_IMPORT_IMAGES_PER_EVENT, (index + 1) * MAX_EXIF_IMPORT_IMAGES_PER_EVENT));
      return chunks.map((chunk, index) => ({
        id: `${date}-${index + 1}`,
        date,
        title: `照片記錄：${dateLabel(date)}${chunks.length > 1 ? `（第 ${index + 1} 批）` : ""}`,
        files: chunk,
      }));
    });
  return { groups, skipped };
}

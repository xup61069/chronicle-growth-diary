export const MAX_EXIF_IMPORT_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_EXIF_IMPORT_IMAGES_PER_EVENT = 8;
export const MAX_EXIF_IMPORT_FILES = 24;
export const PHOTO_IMPORT_MIME_TYPES = ["image/jpeg", "image/heic", "image/heif"] as const;
export const HEIC_JPEG_ESTIMATE_RATIO = 1.35;

export type PhotoExifFile = Pick<File, "name" | "type" | "size">;
export type ExifDateReader = (file: File) => Promise<Date | string | null | undefined>;
export type ExifGpsReader = (file: File) => Promise<{ latitude?: number; longitude?: number } | null | undefined>;
export type PhotoCaptureSource = "exif" | "manual";
export type PhotoGpsSource = "exif" | "manual" | "none";
export type PhotoImportFormat = "jpeg" | "heic";

export type PhotoExifImportCandidate = {
  id: string;
  file: File;
  format: PhotoImportFormat;
  /** A same-stem MOV candidate; the owner must still review it before import. */
  livePhotoCompanion: File | null;
  capturedAt: string;
  source: PhotoCaptureSource;
  latitude: string;
  longitude: string;
  gpsSource: PhotoGpsSource;
};

export type PhotoExifImportGroup = {
  id: string;
  date: string;
  occurredAt: number;
  title: string;
  files: File[];
  photoIds: string[];
  mapLatitudeE6: number | null;
  mapLongitudeE6: number | null;
};

export type PhotoExifImportPreview = {
  photos: PhotoExifImportCandidate[];
  groups: PhotoExifImportGroup[];
  skipped: Array<{ name: string; reason: string }>;
};

export type PhotoImportStorageEstimate = {
  sourceStillBytes: number;
  sourceHeicBytes: number;
  sourceJpegBytes: number;
  livePhotoMotionBytes: number;
  estimatedConvertedHeicBytes: number;
  estimatedStoredBytes: number;
  heicJpegEstimateRatio: number;
};

export function estimatePhotoImportStorage(photos: PhotoExifImportCandidate[]): PhotoImportStorageEstimate {
  const uniqueCompanions = new Map<string, File>();
  let sourceHeicBytes = 0;
  let sourceJpegBytes = 0;
  for (const photo of photos) {
    if (photo.format === "heic") sourceHeicBytes += photo.file.size;
    else sourceJpegBytes += photo.file.size;
    if (photo.livePhotoCompanion) uniqueCompanions.set(`${photo.livePhotoCompanion.name}:${photo.livePhotoCompanion.size}:${photo.livePhotoCompanion.lastModified}`, photo.livePhotoCompanion);
  }
  const livePhotoMotionBytes = Array.from(uniqueCompanions.values()).reduce((sum, file) => sum + file.size, 0);
  const estimatedConvertedHeicBytes = Math.ceil(sourceHeicBytes * HEIC_JPEG_ESTIMATE_RATIO);
  return {
    sourceStillBytes: sourceHeicBytes + sourceJpegBytes,
    sourceHeicBytes,
    sourceJpegBytes,
    livePhotoMotionBytes,
    estimatedConvertedHeicBytes,
    estimatedStoredBytes: sourceJpegBytes + estimatedConvertedHeicBytes + livePhotoMotionBytes,
    heicJpegEstimateRatio: HEIC_JPEG_ESTIMATE_RATIO,
  };
}

export function formatPhotoImportBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function normalizedFileExtension(file: PhotoExifFile) {
  return file.name.trim().split(".").pop()?.toLowerCase() ?? "";
}

export function isHeicPhotoFile(file: PhotoExifFile) {
  return file.type === "image/heic" || file.type === "image/heif" || ["heic", "heif"].includes(normalizedFileExtension(file));
}

export function isSupportedPhotoImportFile(file: PhotoExifFile) {
  return file.type === "image/jpeg" || ["jpg", "jpeg"].includes(normalizedFileExtension(file)) || isHeicPhotoFile(file);
}

function isLivePhotoMotionFile(file: PhotoExifFile) {
  return file.type === "video/quicktime" || normalizedFileExtension(file) === "mov";
}

function livePhotoStem(file: PhotoExifFile) {
  return file.name.trim().replace(/\.[^.]+$/, "").toLocaleLowerCase();
}

/** Converts a selected HEIC/HEIF still locally only when the owner confirms import. */
export async function preparePhotoFileForUpload(file: File): Promise<File> {
  if (!isHeicPhotoFile(file)) return file;
  const { heicTo } = await import("heic-to");
  const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
  const fileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([jpeg], fileName, { type: "image/jpeg", lastModified: file.lastModified });
}

function toLocalDateTimeInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return second === "00" ? `${year}-${month}-${day}T${hour}:${minute}` : `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function toCoordinateInput(value: unknown, maximumAbsoluteValue: number) {
  const coordinate = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(coordinate) || Math.abs(coordinate) > maximumAbsoluteValue) return "";
  return String(Math.round(coordinate * 1_000_000) / 1_000_000);
}

function coordinateE6(value: string, maximumAbsoluteValue: number) {
  if (!value.trim()) return null;
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || Math.abs(coordinate) > maximumAbsoluteValue) return null;
  return Math.round(coordinate * 1_000_000);
}

function dateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
}

export function isValidCapturedAt(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

export function hasValidPhotoLocation(photo: Pick<PhotoExifImportCandidate, "latitude" | "longitude">) {
  return coordinateE6(photo.latitude, 90) !== null && coordinateE6(photo.longitude, 180) !== null;
}

/** Convert a click inside a north-up Web Mercator static-map viewport into a rounded latitude/longitude. */
export function staticMapPointToCoordinate(input: { centerLatitude: number; centerLongitude: number; zoom: number; width: number; height: number; x: number; y: number }) {
  const zoom = Math.min(Math.max(input.zoom, 1), 20);
  const worldSize = 256 * 2 ** zoom;
  const clampLatitude = (latitude: number) => Math.min(Math.max(latitude, -85.05112878), 85.05112878);
  const latToY = (latitude: number) => (1 - Math.asinh(Math.tan(clampLatitude(latitude) * Math.PI / 180)) / Math.PI) / 2 * worldSize;
  const centerX = (input.centerLongitude + 180) / 360 * worldSize;
  const centerY = latToY(input.centerLatitude);
  const x = centerX - input.width / 2 + Math.min(Math.max(input.x, 0), input.width);
  const y = centerY - input.height / 2 + Math.min(Math.max(input.y, 0), input.height);
  const longitude = ((x / worldSize * 360 - 180 + 540) % 360) - 180;
  const mercatorY = Math.PI - 2 * Math.PI * y / worldSize;
  const latitude = 180 / Math.PI * Math.atan(Math.sinh(mercatorY));
  return { latitude: Math.round(latitude * 1_000_000) / 1_000_000, longitude: Math.round(longitude * 1_000_000) / 1_000_000 };
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
      return chunks.map((chunk, index) => {
        const primaryLocation = chunk.find(hasValidPhotoLocation);
        return {
          id: `${date}-${index + 1}`,
          date,
          occurredAt: new Date(chunk[0].capturedAt).getTime(),
          title: `照片記錄：${dateLabel(date)}${chunks.length > 1 ? `（第 ${index + 1} 批）` : ""}`,
          files: chunk.map((photo) => photo.file),
          photoIds: chunk.map((photo) => photo.id),
          mapLatitudeE6: primaryLocation ? coordinateE6(primaryLocation.latitude, 90) : null,
          mapLongitudeE6: primaryLocation ? coordinateE6(primaryLocation.longitude, 180) : null,
        };
      });
    });
}

export function updatePhotoCapturedAt(preview: PhotoExifImportPreview, photoId: string, capturedAt: string): PhotoExifImportPreview {
  const photos = preview.photos.map((photo) => photo.id === photoId ? { ...photo, capturedAt, source: "manual" as const } : photo);
  return { ...preview, photos, groups: buildPhotoExifImportGroups(photos) };
}

export function applyPhotoCapturedAt(preview: PhotoExifImportPreview, photoIds: string[], capturedAt: string, incrementSeconds = 0): PhotoExifImportPreview {
  const selected = new Set(photoIds);
  const safeIncrementSeconds = Number.isInteger(incrementSeconds) && incrementSeconds >= 0 ? incrementSeconds : 0;
  let selectedIndex = 0;
  const photos = preview.photos.map((photo) => {
    if (!selected.has(photo.id)) return photo;
    const nextCapturedAt = safeIncrementSeconds ? toLocalDateTimeInput(new Date(new Date(capturedAt).getTime() + selectedIndex * safeIncrementSeconds * 1_000)) : capturedAt;
    selectedIndex += 1;
    return { ...photo, capturedAt: nextCapturedAt, source: "manual" as const };
  });
  return { ...preview, photos, groups: buildPhotoExifImportGroups(photos) };
}

export function updatePhotoLocation(preview: PhotoExifImportPreview, photoId: string, latitude: string, longitude: string): PhotoExifImportPreview {
  const photos = preview.photos.map((photo) => photo.id === photoId ? { ...photo, latitude, longitude, gpsSource: latitude || longitude ? "manual" as const : "none" as const } : photo);
  return { ...preview, photos, groups: buildPhotoExifImportGroups(photos) };
}

/** Reads capture dates from JPEG or HEIC metadata locally. GPS is read separately for a user-requested preview. */
export async function readPhotoCapturedAt(file: File): Promise<Date | string | null | undefined> {
  const { default: exifr } = await import("exifr/dist/full.esm.mjs");
  const metadata = await exifr.parse(await file.arrayBuffer(), ["DateTimeOriginal", "CreateDate"]);
  return metadata?.DateTimeOriginal ?? metadata?.CreateDate;
}

/** Reads only normalized GPS coordinates for a local preview when the user has requested location import. */
export async function readPhotoGps(file: File): Promise<{ latitude?: number; longitude?: number } | null | undefined> {
  const { default: exifr } = await import("exifr/dist/full.esm.mjs");
  const gps = await exifr.gps(await file.arrayBuffer());
  return gps ? { latitude: gps.latitude, longitude: gps.longitude } : null;
}

export async function preparePhotoExifImport(files: File[], readCapturedAt: ExifDateReader = readPhotoCapturedAt, readGps: ExifGpsReader = readPhotoGps): Promise<PhotoExifImportPreview> {
  const skipped: PhotoExifImportPreview["skipped"] = [];
  const motionFiles = files.filter(isLivePhotoMotionFile);
  const stillFiles = files.filter((file) => !isLivePhotoMotionFile(file));
  const accepted = stillFiles.slice(0, MAX_EXIF_IMPORT_FILES);
  if (stillFiles.length > accepted.length) skipped.push(...stillFiles.slice(MAX_EXIF_IMPORT_FILES).map((file) => ({ name: file.name, reason: `每次最多選取 ${MAX_EXIF_IMPORT_FILES} 張照片` })));
  const motionByStem = new Map(motionFiles.map((file) => [livePhotoStem(file), file]));
  const photos: PhotoExifImportCandidate[] = [];

  for (let index = 0; index < accepted.length; index += 1) {
    const file = accepted[index];
    if (!isSupportedPhotoImportFile(file)) {
      skipped.push({ name: file.name, reason: "只支援 JPEG、HEIC 或 HEIF 照片" });
      continue;
    }
    if (file.size > MAX_EXIF_IMPORT_FILE_BYTES) {
      skipped.push({ name: file.name, reason: "單張照片超過 4MB" });
      continue;
    }

    let capturedAt = "";
    let latitude = "";
    let longitude = "";
    try {
      capturedAt = toLocalDateTimeInput(await readCapturedAt(file));
    } catch {
      capturedAt = "";
    }
    try {
      const gps = await readGps(file);
      latitude = toCoordinateInput(gps?.latitude, 90);
      longitude = toCoordinateInput(gps?.longitude, 180);
    } catch {
      latitude = "";
      longitude = "";
    }
    photos.push({
      id: `${index}-${file.name}`,
      file,
      format: isHeicPhotoFile(file) ? "heic" : "jpeg",
      livePhotoCompanion: motionByStem.get(livePhotoStem(file)) ?? null,
      capturedAt,
      source: capturedAt ? "exif" : "manual",
      latitude,
      longitude,
      gpsSource: latitude && longitude ? "exif" : "none",
    });
  }

  for (const motion of motionFiles) {
    if (!accepted.some((still) => livePhotoStem(still) === livePhotoStem(motion))) skipped.push({ name: motion.name, reason: "找不到同名 JPEG／HEIC 靜態照片，未作為 Live Photo 匯入" });
  }

  return { photos, groups: buildPhotoExifImportGroups(photos), skipped };
}

import JSZip from "jszip";

const ARCHIVE_FORMAT = "chronicle-media-archive";
const ARCHIVE_VERSION = 1;
const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;
const MAX_MEDIA_ITEMS = 40;
const MAX_MEDIA_BYTES = 4 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type ArchiveMediaSource = { url: string; fileName: string; mimeType: string; caption?: string | null; sortOrder?: number };
export type MediaArchiveEventSource = { title: string; occurredAt: number; media: ArchiveMediaSource[] };
type ManifestItem = { eventIndex: number; eventTitle: string; occurredAt: number; entry: string; fileName: string; mimeType: string; caption: string | null; sortOrder: number; byteLength: number };
type Manifest = { format: typeof ARCHIVE_FORMAT; version: typeof ARCHIVE_VERSION; exportedAt: string; eventCount: number; items: ManifestItem[] };
export type ImportedMediaArchive = { eventCount: number; items: Array<{ eventIndex: number; eventTitle: string; occurredAt: number; file: File; caption: string | null; sortOrder: number }> };

function safeFileName(value: string, fallback: string) {
  const normalised = value.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (normalised || fallback).slice(0, 120);
}

function assertSupportedImage(mimeType: string) {
  if (!allowedMimeTypes.has(mimeType)) throw new Error("媒體封存只支援 JPG、PNG、WebP 或 GIF 圖片。");
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function createMediaArchive(events: MediaArchiveEventSource[], exportedAt = new Date().toISOString()) {
  const candidates = events.flatMap((event, eventIndex) => event.media.map((media) => ({ eventIndex, media })));
  if (!candidates.length) throw new Error("目前沒有可打包的事件圖片。");
  if (candidates.length > MAX_MEDIA_ITEMS) throw new Error(`單次最多可打包 ${MAX_MEDIA_ITEMS} 張圖片。`);

  const zip = new JSZip();
  const items: ManifestItem[] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]!;
    assertSupportedImage(candidate.media.mimeType);
    const response = await fetch(candidate.media.url, { credentials: "omit" });
    if (!response.ok) throw new Error(`無法讀取第 ${index + 1} 張圖片；請確認媒體仍可存取後再試。`);
    const blob = await response.blob();
    if (blob.size === 0 || blob.size > MAX_MEDIA_BYTES) throw new Error(`第 ${index + 1} 張圖片超過 4MB 或內容無效，未納入封存。`);
    const fileName = safeFileName(candidate.media.fileName, `image-${index + 1}`);
    const entry = `media/${String(candidate.eventIndex).padStart(3, "0")}-${String(index).padStart(3, "0")}-${fileName}`;
    zip.file(entry, await blob.arrayBuffer(), { binary: true });
    items.push({ eventIndex: candidate.eventIndex, eventTitle: events[candidate.eventIndex]!.title, occurredAt: events[candidate.eventIndex]!.occurredAt, entry, fileName, mimeType: candidate.media.mimeType, caption: candidate.media.caption ?? null, sortOrder: candidate.media.sortOrder ?? index, byteLength: blob.size });
  }
  const manifest: Manifest = { format: ARCHIVE_FORMAT, version: ARCHIVE_VERSION, exportedAt, eventCount: events.length, items };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  if (blob.size > MAX_ARCHIVE_BYTES) throw new Error("封存檔超過 25MB 安全上限；請分批匯出圖片。");
  return { blob, itemCount: items.length, eventCount: events.length };
}

export function downloadMediaArchive(archive: Blob, baseName: string) {
  download(archive, `${safeFileName(baseName, "chronicle-growth-diary")}-media.zip`);
}

export async function readMediaArchive(archive: Blob): Promise<ImportedMediaArchive> {
  if (!archive.size || archive.size > MAX_ARCHIVE_BYTES) throw new Error("媒體封存檔必須介於 1B 與 25MB 之間。");
  const zip = await JSZip.loadAsync(await archive.arrayBuffer(), { createFolders: false });
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("找不到媒體封存 manifest，請選擇 Chronicle 產生的 ZIP 檔。");
  let manifest: Manifest;
  try {
    manifest = JSON.parse(await manifestFile.async("text")) as Manifest;
  } catch {
    throw new Error("媒體封存 manifest 不是有效 JSON。");
  }
  if (manifest.format !== ARCHIVE_FORMAT || manifest.version !== ARCHIVE_VERSION || !Number.isInteger(manifest.eventCount) || !Array.isArray(manifest.items)) {
    throw new Error("只支援 Chronicle 媒體封存格式第 1 版。");
  }
  if (!manifest.items.length || manifest.items.length > MAX_MEDIA_ITEMS) throw new Error(`媒體封存必須包含 1 至 ${MAX_MEDIA_ITEMS} 張圖片。`);
  const items: ImportedMediaArchive["items"] = [];
  let totalBytes = 0;
  for (let index = 0; index < manifest.items.length; index += 1) {
    const item = manifest.items[index]!;
    if (!Number.isInteger(item.eventIndex) || item.eventIndex < 0 || item.eventIndex >= manifest.eventCount || typeof item.eventTitle !== "string" || !Number.isFinite(item.occurredAt) || !Number.isInteger(item.sortOrder) || typeof item.entry !== "string" || !/^media\/\d{3}-\d{3}-[a-zA-Z0-9._-]{1,120}$/.test(item.entry)) {
      throw new Error(`第 ${index + 1} 筆媒體描述格式無效。`);
    }
    assertSupportedImage(item.mimeType);
    const entry = zip.file(item.entry);
    if (!entry || entry.dir) throw new Error(`第 ${index + 1} 張圖片缺失或路徑不安全。`);
    const blob = await entry.async("blob");
    if (!blob.size || blob.size > MAX_MEDIA_BYTES) throw new Error(`第 ${index + 1} 張圖片超過 4MB 或內容無效。`);
    totalBytes += blob.size;
    if (totalBytes > MAX_ARCHIVE_BYTES) throw new Error("解壓後的媒體總大小超過 25MB 安全上限。");
    items.push({ eventIndex: item.eventIndex, eventTitle: item.eventTitle.slice(0, 180), occurredAt: item.occurredAt, file: new File([blob], safeFileName(item.fileName, `image-${index + 1}`), { type: item.mimeType }), caption: typeof item.caption === "string" ? item.caption.slice(0, 240) : null, sortOrder: item.sortOrder });
  }
  return { eventCount: manifest.eventCount, items: items.sort((left, right) => left.eventIndex - right.eventIndex || left.sortOrder - right.sortOrder) };
}

export const MEDIA_ARCHIVE_LIMITS = { maxArchiveBytes: MAX_ARCHIVE_BYTES, maxMediaItems: MAX_MEDIA_ITEMS, maxMediaBytes: MAX_MEDIA_BYTES } as const;

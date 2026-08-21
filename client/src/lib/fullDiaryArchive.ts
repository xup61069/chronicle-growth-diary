import JSZip from "jszip";

const ARCHIVE_FORMAT = "chronicle-full-archive";
const ARCHIVE_VERSION = 1;
const DATA_PATH = "data/chronicle-full.json";
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_ASSET_BYTES = 20 * 1024 * 1024;
const MAX_ASSETS = 120;

export type FullDiaryArchiveAssetSource = {
  id: string;
  kind: "image" | "live_motion" | "voice" | "cover";
  sourceUrl: string;
  fileName: string;
  mimeType: string | null;
};

export type FullDiaryArchiveSource = {
  data: Record<string, unknown>;
  assets: FullDiaryArchiveAssetSource[];
};

type ArchiveManifest = {
  format: typeof ARCHIVE_FORMAT;
  version: typeof ARCHIVE_VERSION;
  exportedAt: string;
  payload: { path: typeof DATA_PATH; sha256: string; byteLength: number };
  assets: Array<{ id: string; kind: FullDiaryArchiveAssetSource["kind"]; path: string; fileName: string; mimeType: string | null; sha256: string; byteLength: number }>;
  exclusions: string[];
};

function safeFileName(value: string, fallback: string) {
  const normalized = value.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (normalized || fallback).slice(0, 120);
}

function assetPath(index: number, asset: FullDiaryArchiveAssetSource) {
  return `assets/${String(index + 1).padStart(3, "0")}-${safeFileName(asset.fileName, asset.id)}`;
}

async function sha256(value: Blob | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : await value.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function assertPortableData(value: unknown) {
  const forbiddenKeys = new Set(["storageKey", "shareSafeStorageKey", "shareTokenHash", "sharePasswordHash", "tokenHash", "passwordHash", "session", "recentAccesses", "shareAccessCount", "lastSharedAt", "scheduleCronTaskUid", "sourceUrl", "url"]);
  const inspect = (entry: unknown): void => {
    if (Array.isArray(entry)) return entry.forEach(inspect);
    if (!entry || typeof entry !== "object") return;
    for (const [key, nested] of Object.entries(entry)) {
      if (forbiddenKeys.has(key)) throw new Error("全量封存偵測到不應攜出的私密欄位，已停止下載。");
      inspect(nested);
    }
  };
  inspect(value);
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function createFullDiaryArchive(source: FullDiaryArchiveSource, exportedAt = new Date().toISOString()) {
  if (source.assets.length > MAX_ASSETS) throw new Error(`單次全量封存最多可包含 ${MAX_ASSETS} 個附件。`);
  assertPortableData(source.data);
  const data: Record<string, unknown> = { ...source.data, exportedAt };
  const payload = JSON.stringify(data, null, 2);
  const payloadBlob = new Blob([payload], { type: "application/json;charset=utf-8" });
  let uncompressedBytes = payloadBlob.size;
  const zip = new JSZip();
  zip.file(DATA_PATH, payload);
  const manifestAssets: ArchiveManifest["assets"] = [];

  for (let index = 0; index < source.assets.length; index += 1) {
    const asset = source.assets[index]!;
    const response = await fetch(asset.sourceUrl, { credentials: "omit" });
    if (!response.ok) throw new Error(`無法讀取第 ${index + 1} 個附件；未建立部分封存。`);
    const blob = await response.blob();
    if (!blob.size || blob.size > MAX_ASSET_BYTES) throw new Error(`第 ${index + 1} 個附件超過 20MB 或內容無效；未建立部分封存。`);
    uncompressedBytes += blob.size;
    if (uncompressedBytes > MAX_ARCHIVE_BYTES) throw new Error("全量封存超過 100MB 安全上限；未建立部分封存。");
    const path = assetPath(index, asset);
    zip.file(path, await blob.arrayBuffer(), { binary: true });
    manifestAssets.push({ id: asset.id, kind: asset.kind, path, fileName: safeFileName(asset.fileName, asset.id), mimeType: asset.mimeType, sha256: await sha256(blob), byteLength: blob.size });
  }

  const manifest: ArchiveManifest = {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    exportedAt,
    payload: { path: DATA_PATH, sha256: await sha256(payloadBlob), byteLength: payloadBlob.size },
    assets: manifestAssets,
    exclusions: [
      "分享 token、分享密碼雜湊、session 與 OAuth state",
      "媒體與語音來源 URL、private storage key 與 share-safe storage key",
      "分享存取紀錄、邀請、協作稽核紀錄與協作者識別資料",
      "排程 task UID 與通知執行狀態",
    ],
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  if (!blob.size || blob.size > MAX_ARCHIVE_BYTES) throw new Error("全量封存超過 100MB 安全上限；未建立部分封存。");
  return { blob, assetCount: manifestAssets.length, eventCount: Array.isArray(data.events) ? data.events.length : 0, manifest };
}

export async function readFullDiaryArchive(archive: Blob) {
  if (!archive.size || archive.size > MAX_ARCHIVE_BYTES) throw new Error("全量封存檔必須介於 1B 與 100MB 之間。");
  const zip = await JSZip.loadAsync(await archive.arrayBuffer(), { createFolders: false });
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) throw new Error("找不到全量封存 manifest。 ");
  let manifest: ArchiveManifest;
  try {
    manifest = JSON.parse(await manifestEntry.async("text")) as ArchiveManifest;
  } catch {
    throw new Error("全量封存 manifest 不是有效 JSON。 ");
  }
  if (manifest.format !== ARCHIVE_FORMAT || manifest.version !== ARCHIVE_VERSION || manifest.payload?.path !== DATA_PATH || !Array.isArray(manifest.assets) || manifest.assets.length > MAX_ASSETS) {
    throw new Error("只支援 Chronicle 全量封存格式第 1 版。 ");
  }
  const payloadEntry = zip.file(DATA_PATH);
  if (!payloadEntry || payloadEntry.dir) throw new Error("全量封存缺少資料 payload。 ");
  const payloadBlob = await payloadEntry.async("blob");
  if (payloadBlob.size !== manifest.payload.byteLength || await sha256(payloadBlob) !== manifest.payload.sha256) throw new Error("全量封存資料完整性驗證失敗。 ");
  let data: unknown;
  try {
    data = JSON.parse(await payloadBlob.text());
  } catch {
    throw new Error("全量封存資料 payload 不是有效 JSON。 ");
  }
  if (!data || typeof data !== "object" || (data as Record<string, unknown>).format !== "chronicle-growth-diary-full" || (data as Record<string, unknown>).version !== 1) {
    throw new Error("全量封存資料格式無效。 ");
  }
  assertPortableData(data);
  const expectedPaths = new Set(["manifest.json", DATA_PATH]);
  for (const asset of manifest.assets) {
    if (!asset || typeof asset.id !== "string" || typeof asset.path !== "string" || !/^assets\/\d{3}-[a-zA-Z0-9._-]{1,120}$/.test(asset.path) || !Number.isInteger(asset.byteLength) || asset.byteLength <= 0 || asset.byteLength > MAX_ASSET_BYTES || !/^[a-f0-9]{64}$/.test(asset.sha256)) {
      throw new Error("全量封存附件描述格式無效。 ");
    }
    if (expectedPaths.has(asset.path)) throw new Error("全量封存附件路徑重複。 ");
    expectedPaths.add(asset.path);
    const entry = zip.file(asset.path);
    if (!entry || entry.dir) throw new Error("全量封存缺少附件。 ");
    const blob = await entry.async("blob");
    if (blob.size !== asset.byteLength || await sha256(blob) !== asset.sha256) throw new Error("全量封存附件完整性驗證失敗。 ");
  }
  const unexpectedFile = Object.values(zip.files).find((entry) => !entry.dir && !expectedPaths.has(entry.name));
  if (unexpectedFile) throw new Error("全量封存包含未宣告的檔案。 ");
  return { data: data as Record<string, unknown>, assetCount: manifest.assets.length, manifest };
}

export function downloadFullDiaryArchive(archive: Blob, baseName: string) {
  download(archive, `${safeFileName(baseName, "chronicle-growth-diary")}-full-archive.zip`);
}

export const FULL_ARCHIVE_LIMITS = { maxArchiveBytes: MAX_ARCHIVE_BYTES, maxAssetBytes: MAX_ASSET_BYTES, maxAssets: MAX_ASSETS } as const;

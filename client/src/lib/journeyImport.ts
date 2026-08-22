import JSZip from "jszip";

const MAX_JOURNEY_ARCHIVE_BYTES = 32 * 1024 * 1024;
const MAX_JOURNEY_ENTRY_BYTES = 4 * 1024 * 1024;
const MAX_JOURNEY_FILES = 1_000;
const MAX_JOURNEY_ENTRIES = 250;
const JOURNEY_DEFAULT_TAG = "Journey 匯入";

export type JourneyImportCandidate = {
  sourceId: string;
  occurredAt: number;
  title: string;
  body: string;
  tagNames: string[];
};

export type JourneyImportPreview = {
  candidates: JourneyImportCandidate[];
  skippedCount: number;
  duplicateCount: number;
};

type JourneyEntry = {
  id?: unknown;
  date_journal?: unknown;
  text?: unknown;
  tags?: unknown;
};

function safeZipPath(path: string) {
  return Boolean(path) && !path.startsWith("/") && !path.includes("\\") && !path.split("/").some((part) => !part || part === "." || part === "..");
}

function titleFromText(body: string) {
  return body.split(/\r?\n/).map((line) => line.trim()).find(Boolean)?.slice(0, 180) ?? "Journey 記事";
}

function tagsFromEntry(value: unknown) {
  if (!Array.isArray(value)) return [JOURNEY_DEFAULT_TAG];
  const tags = value.filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().replace(/\s+/g, " "))
    .filter((tag) => tag && tag.length <= 24 && tag !== JOURNEY_DEFAULT_TAG);
  return Array.from(new Set([JOURNEY_DEFAULT_TAG, ...tags])).slice(0, 8);
}

function plainText(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    .replace(/<\s*br\s*\/?>|<\s*\/\s*(p|div|h[1-6]|li|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/gi, (entity) => ({ "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'" }[entity.toLowerCase()] ?? " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
    .slice(0, 8_000);
}

function occurredAtFromEntry(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed >= -2208988800000 && parsed <= 4102444800000 ? parsed : null;
}

export async function readJourneyImport(file: File): Promise<JourneyImportPreview> {
  if (!file.name.toLowerCase().endsWith(".zip")) throw new Error("Journey 匯入只接受原始 ZIP 匯出檔。 ");
  if (!file.size || file.size > MAX_JOURNEY_ARCHIVE_BYTES) throw new Error("Journey ZIP 必須介於 1B 與 32MB 之間。 ");
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer(), { createFolders: false });
  } catch {
    throw new Error("無法讀取 Journey ZIP 匯出檔。 ");
  }
  const files = Object.values(zip.files).filter((entry) => !entry.dir);
  if (!files.length || files.length > MAX_JOURNEY_FILES || files.some((entry) => !safeZipPath(entry.name))) throw new Error("Journey ZIP 的檔案路徑或檔案數量不安全。 ");
  const jsonFiles = files.filter((entry) => entry.name.toLowerCase().endsWith(".json"));
  if (!jsonFiles.length) throw new Error("Journey ZIP 沒有可讀取的 JSON 記事。 ");

  const candidates: JourneyImportCandidate[] = [];
  const seen = new Set<string>();
  let skippedCount = 0;
  let duplicateCount = 0;
  for (const jsonFile of jsonFiles.sort((left, right) => left.name.localeCompare(right.name))) {
    const blob = await jsonFile.async("blob");
    if (!blob.size || blob.size > MAX_JOURNEY_ENTRY_BYTES) {
      skippedCount += 1;
      continue;
    }
    let value: unknown;
    try {
      value = JSON.parse(await blob.text());
    } catch {
      skippedCount += 1;
      continue;
    }
    const entry = value as JourneyEntry;
    const occurredAt = occurredAtFromEntry(entry?.date_journal);
    const body = plainText(entry?.text);
    if (occurredAt === null || !body) {
      skippedCount += 1;
      continue;
    }
    const tagNames = tagsFromEntry(entry.tags);
    const providerId = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim().slice(0, 128) : null;
    const duplicateKey = providerId ? `id:${providerId}` : `content:${occurredAt}|${body}`;
    if (seen.has(duplicateKey)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(duplicateKey);
    candidates.push({ sourceId: providerId ?? jsonFile.name, occurredAt, title: titleFromText(body), body, tagNames });
    if (candidates.length > MAX_JOURNEY_ENTRIES) throw new Error(`Journey 匯出最多可先審核 ${MAX_JOURNEY_ENTRIES} 筆記事。`);
  }
  if (!candidates.length) throw new Error("Journey ZIP 沒有可安全審核的 JSON 記事。 ");
  return { candidates, skippedCount, duplicateCount };
}

export const JOURNEY_IMPORT_LIMITS = { maxArchiveBytes: MAX_JOURNEY_ARCHIVE_BYTES, maxEntryBytes: MAX_JOURNEY_ENTRY_BYTES, maxFiles: MAX_JOURNEY_FILES, maxEntries: MAX_JOURNEY_ENTRIES } as const;

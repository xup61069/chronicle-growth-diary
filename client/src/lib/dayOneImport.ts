import JSZip from "jszip";

const MAX_DAY_ONE_ARCHIVE_BYTES = 32 * 1024 * 1024;
const MAX_DAY_ONE_JSON_BYTES = 4 * 1024 * 1024;
const MAX_DAY_ONE_ENTRIES = 250;
const DAY_ONE_DEFAULT_TAG = "Day One 匯入";

export type DayOneImportCandidate = {
  sourceId: string;
  occurredAt: number;
  title: string;
  body: string;
  tagNames: string[];
};

export type DayOneImportPreview = {
  candidates: DayOneImportCandidate[];
  skippedCount: number;
  duplicateCount: number;
  sourceKind: "json" | "zip";
};

type DayOneEntry = {
  uuid?: unknown;
  creationDate?: unknown;
  text?: unknown;
  tags?: unknown;
};

function safeZipPath(path: string) {
  return Boolean(path) && !path.startsWith("/") && !path.includes("\\") && !path.split("/").some((part) => !part || part === "." || part === "..");
}

function titleFromText(body: string) {
  const first = body.split(/\r?\n/).map((line) => line.replace(/^#{1,6}\s*/, "").trim()).find(Boolean) ?? "Day One 記事";
  return first.slice(0, 180);
}

function tagsFromEntry(value: unknown) {
  if (!Array.isArray(value)) return [DAY_ONE_DEFAULT_TAG];
  const tags = value.filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().replace(/\s+/g, " "))
    .filter((tag) => tag && tag.length <= 24 && tag !== DAY_ONE_DEFAULT_TAG);
  return Array.from(new Set([DAY_ONE_DEFAULT_TAG, ...tags])).slice(0, 8);
}

function parseDayOnePayload(raw: string, sourceKind: DayOneImportPreview["sourceKind"]): DayOneImportPreview {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("Day One 匯出檔不是有效 JSON。 ");
  }
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { entries?: unknown }).entries)) {
    throw new Error("只支援含有 entries 的 Day One JSON 匯出。 ");
  }
  const entries = (payload as { entries: unknown[] }).entries;
  if (entries.length > MAX_DAY_ONE_ENTRIES) throw new Error(`Day One 匯出最多可先審核 ${MAX_DAY_ONE_ENTRIES} 筆記事。`);
  const candidates: DayOneImportCandidate[] = [];
  const seen = new Set<string>();
  let skippedCount = 0;
  let duplicateCount = 0;
  entries.forEach((value, index) => {
    const entry = value as DayOneEntry;
    if (!entry || typeof entry.creationDate !== "string") {
      skippedCount += 1;
      return;
    }
    const occurredAt = new Date(entry.creationDate).getTime();
    if (!Number.isSafeInteger(occurredAt) || occurredAt < -2208988800000 || occurredAt > 4102444800000) {
      skippedCount += 1;
      return;
    }
    const body = typeof entry.text === "string" ? entry.text.trim().slice(0, 8000) : "";
    const sourceId = typeof entry.uuid === "string" && entry.uuid.trim() ? entry.uuid.trim().slice(0, 128) : `local-${index + 1}`;
    const duplicateKey = sourceId;
    if (seen.has(duplicateKey)) {
      duplicateCount += 1;
      return;
    }
    seen.add(duplicateKey);
    candidates.push({ sourceId, occurredAt, title: titleFromText(body), body, tagNames: tagsFromEntry(entry.tags) });
  });
  return { candidates, skippedCount, duplicateCount, sourceKind };
}

export async function readDayOneImport(file: File): Promise<DayOneImportPreview> {
  if (!file.size || file.size > MAX_DAY_ONE_ARCHIVE_BYTES) throw new Error("Day One 匯出檔必須介於 1B 與 32MB 之間。 ");
  if (!file.name.toLowerCase().endsWith(".zip")) {
    if (file.size > MAX_DAY_ONE_JSON_BYTES) throw new Error("Day One JSON 不可超過 4MB。 ");
    return parseDayOnePayload(await file.text(), "json");
  }
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer(), { createFolders: false });
  } catch {
    throw new Error("無法讀取 Day One ZIP 匯出檔。 ");
  }
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (!entries.length || entries.length > 1_000 || entries.some((entry) => !safeZipPath(entry.name))) throw new Error("Day One ZIP 的檔案路徑或檔案數量不安全。 ");
  const jsonEntries = entries.filter((entry) => entry.name.toLocaleLowerCase() === "journal.json");
  if (jsonEntries.length !== 1) throw new Error("Day One ZIP 必須在根目錄包含唯一的 Journal.json。 ");
  const jsonBlob = await jsonEntries[0]!.async("blob");
  if (!jsonBlob.size || jsonBlob.size > MAX_DAY_ONE_JSON_BYTES) throw new Error("Day One 的 Journal.json 必須介於 1B 與 4MB 之間。 ");
  return parseDayOnePayload(await jsonBlob.text(), "zip");
}

export const DAY_ONE_IMPORT_LIMITS = { maxArchiveBytes: MAX_DAY_ONE_ARCHIVE_BYTES, maxJsonBytes: MAX_DAY_ONE_JSON_BYTES, maxEntries: MAX_DAY_ONE_ENTRIES } as const;

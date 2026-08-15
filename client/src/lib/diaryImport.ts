import { diaryColors, eventTypes, type DatePrecision, type EventType } from "./diaryEditor";

const MAX_IMPORT_EVENTS = 250;
const validTypes = new Set(eventTypes.map((item) => item.value));
const validColors = new Set<string>(diaryColors);

export type ChronicleImportEvent = {
  occurredAt: number;
  datePrecision: DatePrecision;
  eventType: EventType;
  title: string;
  body: string;
  ageLabel: string | null;
  place: string | null;
  color: (typeof diaryColors)[number];
  tagNames: string[];
};

export type ChronicleImportPreview = {
  title: string;
  sourceExportedAt: string;
  events: ChronicleImportEvent[];
  skippedMediaCount: number;
  warnings: string[];
};

function asOptionalString(value: unknown, limit: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, limit) : null;
}

function parseOccurredAt(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp >= -2208988800000 && timestamp <= 4102444800000 ? timestamp : null;
}

export function parseChronicleImport(raw: string): ChronicleImportPreview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("檔案不是有效的 JSON。請選擇 Chronicle 匯出的備份檔。 ");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("找不到 Chronicle 匯入資料。 ");
  const archive = parsed as { format?: unknown; version?: unknown; exportedAt?: unknown; diary?: { title?: unknown }; events?: unknown };
  if (archive.format !== "chronicle-growth-diary" || archive.version !== 1) throw new Error("只支援 Chronicle JSON 匯出格式的第 1 版備份檔。 ");
  if (!Array.isArray(archive.events) || archive.events.length === 0) throw new Error("備份檔中沒有可匯入的事件。 ");
  if (archive.events.length > MAX_IMPORT_EVENTS) throw new Error(`單次最多可匯入 ${MAX_IMPORT_EVENTS} 筆事件。`);

  const events: ChronicleImportEvent[] = [];
  let skippedMediaCount = 0;
  for (const [index, candidate] of Array.from(archive.events.entries())) {
    if (!candidate || typeof candidate !== "object") throw new Error(`第 ${index + 1} 筆事件不是有效物件。`);
    const event = candidate as Record<string, unknown>;
    const occurredAt = parseOccurredAt(event.occurredAt);
    const title = asOptionalString(event.title, 180);
    const body = typeof event.body === "string" ? event.body.trim().slice(0, 8000) : null;
    const type = event.eventType;
    const precision = event.datePrecision;
    if (!occurredAt || !title || body === null || !validTypes.has(type as EventType) || !["day", "month", "year"].includes(precision as string)) {
      throw new Error(`第 ${index + 1} 筆事件缺少必要欄位或資料格式不正確。`);
    }
    const tagNames = Array.isArray(event.tags)
      ? event.tags.map((tag) => asOptionalString((tag as { name?: unknown })?.name, 24)).filter((tag): tag is string => Boolean(tag)).slice(0, 8)
      : [];
    if (Array.isArray(event.media)) skippedMediaCount += event.media.length;
    events.push({
      occurredAt,
      datePrecision: precision as DatePrecision,
      eventType: type as EventType,
      title,
      body,
      ageLabel: asOptionalString(event.ageLabel, 80),
      place: asOptionalString(event.place, 180),
      color: (validColors.has(event.color as string) ? event.color : "#EE623B") as (typeof diaryColors)[number],
      tagNames: Array.from(new Set(tagNames)),
    });
  }
  return {
    title: asOptionalString(archive.diary?.title, 160) ?? "未命名 Chronicle 備份",
    sourceExportedAt: typeof archive.exportedAt === "string" ? archive.exportedAt : "未知時間",
    events,
    skippedMediaCount,
    warnings: skippedMediaCount ? ["媒體 URL、原始檔案、分享設定與帳號資料不會被匯入；請在匯入後自行重新上傳圖片。"] : ["分享設定、帳號資料與任何私密憑證不會被匯入。"],
  };
}

export { MAX_IMPORT_EVENTS };

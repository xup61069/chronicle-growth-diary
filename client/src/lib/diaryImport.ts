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
  skillNames: string[];
  phaseKeywords: string[];
  track: "career" | "skills" | "life" | "hardware";
  milestoneType: "standard" | "highlight" | "turning_point" | "gear_workflow" | "reflection";
  milestoneWeight: number;
  comparisonGroup: string | null;
  unlocksAt: number | null;
  mapLatitudeE6: number | null;
  mapLongitudeE6: number | null;
  locationPrivacy: "none" | "city" | "precise";
  soundtrackTitle: string | null;
  soundtrackUrl: string | null;
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

function parseStringList(value: unknown, limit = 8) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((item) => asOptionalString(item, 24)).filter((item): item is string => Boolean(item)))).slice(0, limit)
    : [];
}

function parseOptionalTimestamp(value: unknown) {
  return typeof value === "string" ? parseOccurredAt(value) : typeof value === "number" && Number.isFinite(value) ? value : null;
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
      ? Array.from(new Set(event.tags.map((tag) => asOptionalString((tag as { name?: unknown })?.name, 24)).filter((tag): tag is string => Boolean(tag)))).slice(0, 8)
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
      tagNames,
      skillNames: parseStringList(event.skillNames),
      phaseKeywords: parseStringList(event.phaseKeywords),
      track: event.track === "career" || event.track === "skills" || event.track === "hardware" ? event.track : "life",
      milestoneType: event.milestoneType === "highlight" || event.milestoneType === "turning_point" || event.milestoneType === "gear_workflow" || event.milestoneType === "reflection" ? event.milestoneType : "standard",
      milestoneWeight: typeof event.milestoneWeight === "number" && event.milestoneWeight >= 1 && event.milestoneWeight <= 5 ? Math.round(event.milestoneWeight) : 1,
      comparisonGroup: asOptionalString(event.comparisonGroup, 96),
      unlocksAt: parseOptionalTimestamp(event.unlocksAt),
      mapLatitudeE6: typeof event.mapLatitudeE6 === "number" && Math.abs(event.mapLatitudeE6) <= 90_000_000 ? Math.round(event.mapLatitudeE6) : null,
      mapLongitudeE6: typeof event.mapLongitudeE6 === "number" && Math.abs(event.mapLongitudeE6) <= 180_000_000 ? Math.round(event.mapLongitudeE6) : null,
      locationPrivacy: event.locationPrivacy === "city" || event.locationPrivacy === "precise" ? event.locationPrivacy : "none",
      soundtrackTitle: asOptionalString(event.soundtrackTitle, 120),
      soundtrackUrl: asOptionalString(event.soundtrackUrl, 1024),
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

export const CHRONICLE_EXPORT_VERSION = 1;

type PortableTagSource = { name: string; color?: string | null };
type PortableMediaSource = { url: string; fileName: string; mimeType: string; caption?: string | null; sortOrder?: number };
type PortableEventSource = {
  occurredAt: number;
  datePrecision: "day" | "month" | "year";
  eventType: string;
  title: string;
  body: string;
  ageLabel?: string | null;
  place?: string | null;
  color: string;
  isPublic: boolean;
  timelinePosition?: number;
  phaseKeywords?: string[];
  tags: PortableTagSource[];
  media: PortableMediaSource[];
};

export type PortableDiarySource = {
  diary: {
    title: string;
    subtitle?: string | null;
    birthYear?: number | null;
    educationStartYear?: number | null;
    careerStartYear?: number | null;
    childhoodStartYear?: number | null;
    childhoodEndYear?: number | null;
    educationEndYear?: number | null;
    careerEndYear?: number | null;
    publicCoverUrl?: string | null;
    publicCoverTitle?: string | null;
    publicStoryLayout?: "editorial" | "gallery" | "minimal";
  };
  events: PortableEventSource[];
  reflections: Array<{ phaseKey: string; recap: string; reflection: string; model?: string }>;
};

export type ChroniclePortableExport = {
  format: "chronicle-growth-diary";
  version: typeof CHRONICLE_EXPORT_VERSION;
  exportedAt: string;
  diary: PortableDiarySource["diary"];
  events: Array<Omit<PortableEventSource, "occurredAt" | "tags" | "media"> & {
    occurredAt: string;
    tags: Array<{ name: string; color: string | null }>;
    media: Array<{ url: string; fileName: string; mimeType: string; caption: string | null; sortOrder: number }>;
  }>;
  reflections: PortableDiarySource["reflections"];
  notes: string[];
};

function heading(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/^\s*#+\s*/, "").trim();
}

function formatEventDate(occurredAt: string, precision: "day" | "month" | "year") {
  const date = new Date(occurredAt);
  if (precision === "year") return String(date.getUTCFullYear());
  if (precision === "month") return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return date.toISOString().slice(0, 10);
}

export function createPortableDiaryExport(source: PortableDiarySource, exportedAt = new Date().toISOString()): ChroniclePortableExport {
  return {
    format: "chronicle-growth-diary",
    version: CHRONICLE_EXPORT_VERSION,
    exportedAt,
    diary: {
      title: source.diary.title,
      subtitle: source.diary.subtitle ?? null,
      birthYear: source.diary.birthYear ?? null,
      educationStartYear: source.diary.educationStartYear ?? null,
      careerStartYear: source.diary.careerStartYear ?? null,
      childhoodStartYear: source.diary.childhoodStartYear ?? null,
      childhoodEndYear: source.diary.childhoodEndYear ?? null,
      educationEndYear: source.diary.educationEndYear ?? null,
      careerEndYear: source.diary.careerEndYear ?? null,
      publicCoverUrl: source.diary.publicCoverUrl ?? null,
      publicCoverTitle: source.diary.publicCoverTitle ?? null,
      publicStoryLayout: source.diary.publicStoryLayout ?? "editorial",
    },
    events: source.events.map((event) => ({
      occurredAt: new Date(event.occurredAt).toISOString(),
      datePrecision: event.datePrecision,
      eventType: event.eventType,
      title: event.title,
      body: event.body,
      ageLabel: event.ageLabel ?? null,
      place: event.place ?? null,
      color: event.color,
      isPublic: event.isPublic,
      timelinePosition: event.timelinePosition ?? 0,
      phaseKeywords: event.phaseKeywords ?? [],
      tags: event.tags.map((tag) => ({ name: tag.name, color: tag.color ?? null })),
      media: event.media.map((media) => ({ url: media.url, fileName: media.fileName, mimeType: media.mimeType, caption: media.caption ?? null, sortOrder: media.sortOrder ?? 0 })),
    })),
    reflections: source.reflections.map((reflection) => ({ phaseKey: reflection.phaseKey, recap: reflection.recap, reflection: reflection.reflection, model: reflection.model ?? "unknown" })),
    notes: ["媒體項目僅包含可存取 URL 與描述，不包含原始檔案位元組或儲存金鑰。", "分享憑證、分享密碼雜湊、工作階段與存取紀錄不會匯出。"],
  };
}

export function portableDiaryToMarkdown(portable: ChroniclePortableExport) {
  const lines = [`# ${heading(portable.diary.title) || "Chronicle 成長日記"}`, "", `> 匯出時間：${portable.exportedAt}`, "> 此檔案不含分享憑證、密碼雜湊、工作階段、存取紀錄或媒體儲存金鑰。", ""];
  if (portable.diary.subtitle) lines.push(portable.diary.subtitle, "");
  lines.push("## 事件", "");
  for (const event of portable.events) {
    lines.push(`### ${formatEventDate(event.occurredAt, event.datePrecision)} · ${heading(event.title)}`, "");
    lines.push(`- 類型：${event.eventType}`);
    if (event.ageLabel) lines.push(`- 年紀／階段：${event.ageLabel}`);
    if (event.place) lines.push(`- 地點：${event.place}`);
    if (event.phaseKeywords?.length) lines.push(`- 階段關鍵字：${event.phaseKeywords.map((keyword) => `#${keyword}`).join(" ")}`);
    if (event.tags.length) lines.push(`- 標籤：${event.tags.map((tag) => `#${tag.name}`).join(" ")}`);
    lines.push("", event.body || "（未填寫內容）", "");
    if (event.media.length) {
      lines.push("#### 媒體", "");
      for (const media of event.media) lines.push(`- [${media.fileName}](${media.url})${media.caption ? `：${media.caption}` : ""}`);
      lines.push("");
    }
  }
  if (portable.reflections.length) {
    lines.push("## 人生階段回顧", "");
    for (const reflection of portable.reflections) lines.push(`### ${heading(reflection.phaseKey)}`, "", reflection.recap, "", reflection.reflection, "");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function downloadPortableDiary(portable: ChroniclePortableExport, format: "json" | "markdown", baseName: string) {
  const content = format === "json" ? JSON.stringify(portable, null, 2) : portableDiaryToMarkdown(portable);
  const type = format === "json" ? "application/json;charset=utf-8" : "text/markdown;charset=utf-8";
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${baseName}.${format === "json" ? "json" : "md"}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

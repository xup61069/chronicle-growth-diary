import { parseChronicleImport, type ChronicleImportPreview } from "./diaryImport";

type FrontmatterTag = { name: string; color?: string | null };
type FrontmatterEvent = {
  occurredAt: number;
  datePrecision: "day" | "month" | "year";
  eventType: string;
  title: string;
  body: string;
  ageLabel?: string | null;
  place?: string | null;
  color: string;
  isPublic: boolean;
  tags: FrontmatterTag[];
  skillNames?: string[];
  phaseKeywords?: string[];
  track?: string;
  milestoneType?: string;
  milestoneWeight?: number;
  comparisonGroup?: string | null;
  unlocksAt?: number | null;
  mapLatitudeE6?: number | null;
  mapLongitudeE6?: number | null;
  locationPrivacy?: string;
  soundtrackTitle?: string | null;
  soundtrackUrl?: string | null;
};

export type FrontmatterDiarySource = {
  diary: { title: string; subtitle?: string | null };
  events: FrontmatterEvent[];
};

const frontmatterKeys = ["occurredAt", "datePrecision", "eventType", "title", "ageLabel", "place", "color", "isPublic", "tags", "skillNames", "phaseKeywords", "track", "milestoneType", "milestoneWeight", "comparisonGroup", "unlocksAt", "mapLatitudeE6", "mapLongitudeE6", "locationPrivacy", "soundtrackTitle", "soundtrackUrl"] as const;

function yamlValue(value: unknown) {
  return JSON.stringify(value ?? null);
}

function parseYamlValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value.trim();
  }
}

function parseFrontmatterDocument(raw: string) {
  const matched = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!matched) throw new Error("找不到 Chronicle Frontmatter 區塊。請使用 Chronicle 匯出的 Markdown 檔。 ");
  const values: Record<string, unknown> = {};
  for (const line of matched[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    values[line.slice(0, separator).trim()] = parseYamlValue(line.slice(separator + 1).trim());
  }
  return { values, body: matched[2].replace(/^\n+|\n+$/g, "") };
}

export function createChronicleFrontmatter(source: FrontmatterDiarySource, exportedAt = new Date().toISOString()) {
  const header = ["---", "chronicle: \"growth-diary\"", "version: 1", `title: ${yamlValue(source.diary.title)}`, `subtitle: ${yamlValue(source.diary.subtitle ?? null)}`, `exportedAt: ${yamlValue(exportedAt)}`, "---", "", `# ${source.diary.title}`, "", "> Chronicle Frontmatter v1：可提交至 Git；匯入前仍會在本機預覽與驗證。未解鎖時空膠囊應先由可攜匯出策略遮罩。", ""];
  const events = source.events.map((event) => {
    const lines = ["<!-- chronicle:event -->", "---"];
    for (const key of frontmatterKeys) {
      const value = key === "occurredAt" || key === "unlocksAt"
        ? event[key] ? new Date(event[key] as number).toISOString() : null
        : key === "tags" ? event.tags.map((tag) => tag.name)
        : event[key as keyof FrontmatterEvent];
      lines.push(`${key}: ${yamlValue(value)}`);
    }
    lines.push("---", "", event.body.trim(), "");
    return lines.join("\n");
  });
  return [...header, ...events].join("\n").trimEnd() + "\n";
}

export function parseChronicleFrontmatter(raw: string): ChronicleImportPreview {
  const [archiveRaw, ...eventRaws] = raw.split(/<!--\s*chronicle:event\s*-->/i);
  const archive = parseFrontmatterDocument(archiveRaw);
  if (archive.values.chronicle !== "growth-diary" || archive.values.version !== 1) throw new Error("只支援 Chronicle Frontmatter v1 匯出檔。 ");
  if (!eventRaws.length) throw new Error("Frontmatter 檔中沒有可匯入的事件。 ");
  const events = eventRaws.map((eventRaw) => {
    const { values, body } = parseFrontmatterDocument(eventRaw.trim());
    const tagNames = Array.isArray(values.tags) ? values.tags : [];
    return { ...values, body, tags: tagNames.map((name) => ({ name })) };
  });
  return parseChronicleImport(JSON.stringify({
    format: "chronicle-growth-diary",
    version: 1,
    exportedAt: typeof archive.values.exportedAt === "string" ? archive.values.exportedAt : new Date().toISOString(),
    diary: { title: typeof archive.values.title === "string" ? archive.values.title : "Chronicle Frontmatter" },
    events,
  }));
}

export function downloadChronicleFrontmatter(content: string, baseName: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${baseName}.chronicle.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

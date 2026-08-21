import ICAL from "ical.js";

export const MAX_ICS_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_ICS_IMPORT_EVENTS = 250;

export type IcsImportCandidate = {
  id: string;
  sourceUid: string;
  title: string;
  body: string;
  occurredAt: number;
  datePrecision: "day";
  allDay: boolean;
  isRecurring: boolean;
  selected: boolean;
};

export type IcsImportPreview = {
  candidates: IcsImportCandidate[];
  skipped: Array<{ sourceUid: string | null; reason: string }>;
  warnings: string[];
};

function compactText(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function localDateStart(value: { year: number; month: number; day: number }) {
  return new Date(value.year, value.month - 1, value.day).getTime();
}

/** Parses a selected ICS file in-browser. It never dereferences URLs or imports alarm/attendee data. */
export function parseIcsCalendar(raw: string): IcsImportPreview {
  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r?\n[ \t]/g, "");
  let root: ICAL.Component;
  try {
    root = new ICAL.Component(ICAL.parse(normalized));
  } catch {
    throw new Error("這不是可讀取的 ICS 行事曆檔案。請選擇含有 VCALENDAR 與 VEVENT 的 .ics 檔。 ");
  }

  if (root.name !== "vcalendar") throw new Error("ICS 檔缺少 VCALENDAR 根節點。 ");
  const candidates: IcsImportCandidate[] = [];
  const skipped: IcsImportPreview["skipped"] = [];
  const warnings = ["只匯入已勾選事件的標題、說明與日期；提醒、受邀者、主辦人、會議網址、附件與重複規則不會帶入。"];
  const events = root.getAllSubcomponents("vevent");

  for (let index = 0; index < events.length; index += 1) {
    if (candidates.length >= MAX_ICS_IMPORT_EVENTS) {
      skipped.push({ sourceUid: null, reason: `每次最多審核 ${MAX_ICS_IMPORT_EVENTS} 個日曆事件` });
      break;
    }
    const component = events[index]!;
    const uid = compactText(component.getFirstPropertyValue("uid"), 180) || `local-${index + 1}`;
    const start = component.getFirstPropertyValue("dtstart") as ICAL.Time | null;
    if (!start) {
      skipped.push({ sourceUid: uid, reason: "缺少 DTSTART，無法建立時間軸草稿" });
      continue;
    }
    const allDay = start.isDate;
    const occurredAt = allDay ? localDateStart(start) : start.toJSDate().getTime();
    if (!Number.isFinite(occurredAt)) {
      skipped.push({ sourceUid: uid, reason: "日期格式無法轉換為本機時間" });
      continue;
    }
    const recurring = component.hasProperty("rrule") || component.hasProperty("rdate");
    if (recurring) warnings.push("偵測到重複事件；目前只保留其起始事件，不展開後續週期。");
    candidates.push({
      id: `${uid}-${index}`,
      sourceUid: uid,
      title: compactText(component.getFirstPropertyValue("summary"), 180) || "未命名行事曆事件",
      body: compactText(component.getFirstPropertyValue("description"), 8_000),
      occurredAt,
      datePrecision: "day",
      allDay,
      isRecurring: recurring,
      selected: true,
    });
  }

  return { candidates, skipped, warnings: Array.from(new Set(warnings)) };
}

export function updateIcsImportCandidate(preview: IcsImportPreview, candidateId: string, updates: Partial<Pick<IcsImportCandidate, "title" | "body" | "occurredAt" | "selected">>): IcsImportPreview {
  return { ...preview, candidates: preview.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, ...updates } : candidate) };
}

export function selectedIcsImportCandidates(preview: IcsImportPreview) {
  return preview.candidates.filter((candidate) => candidate.selected);
}

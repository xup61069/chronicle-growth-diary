import ICAL from "ical.js";

export const MAX_ICS_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_ICS_IMPORT_EVENTS = 250;
export const MAX_ICS_RECURRING_OCCURRENCES = 12;
export const MAX_ICS_CONFIRMED_OCCURRENCES = 250;

export type IcsRecurrenceHandling = "base" | "next_4" | "next_12";

export type IcsImportCandidate = {
  id: string;
  sourceUid: string;
  title: string;
  body: string;
  occurredAt: number;
  datePrecision: "day";
  allDay: boolean;
  isRecurring: boolean;
  recurrenceRule: string | null;
  recurrenceOccurrences: number[];
  recurrenceHandling: IcsRecurrenceHandling;
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

function occurrenceTimestamp(value: ICAL.Time) {
  return value.isDate ? localDateStart(value) : value.toJSDate().getTime();
}

function getRecurringOccurrenceTimestamps(component: ICAL.Component, fallback: number) {
  try {
    const iterator = new ICAL.Event(component).iterator();
    const occurrences: number[] = [];
    for (let index = 0; index < MAX_ICS_RECURRING_OCCURRENCES; index += 1) {
      const next = iterator.next();
      if (!next) break;
      const timestamp = occurrenceTimestamp(next);
      if (Number.isFinite(timestamp) && !occurrences.includes(timestamp)) occurrences.push(timestamp);
    }
    return occurrences.length ? occurrences : [fallback];
  } catch {
    return [fallback];
  }
}

function requestedOccurrenceCount(candidate: IcsImportCandidate) {
  if (!candidate.isRecurring || candidate.recurrenceHandling === "base") return 1;
  return candidate.recurrenceHandling === "next_4" ? 4 : MAX_ICS_RECURRING_OCCURRENCES;
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
    const recurrenceRule = recurring ? compactText(component.getFirstPropertyValue("rrule")?.toString() ?? component.getFirstPropertyValue("rdate")?.toString(), 240) || null : null;
    const recurrenceOccurrences = recurring ? getRecurringOccurrenceTimestamps(component, occurredAt) : [occurredAt];
    if (recurring) warnings.push("偵測到重複事件；預設只匯入起始事件。你可在下方選擇有限次數的本機展開，確認前不會建立任何事件。");
    candidates.push({
      id: `${uid}-${index}`,
      sourceUid: uid,
      title: compactText(component.getFirstPropertyValue("summary"), 180) || "未命名行事曆事件",
      body: compactText(component.getFirstPropertyValue("description"), 8_000),
      occurredAt,
      datePrecision: "day",
      allDay,
      isRecurring: recurring,
      recurrenceRule,
      recurrenceOccurrences,
      recurrenceHandling: "base",
      selected: true,
    });
  }

  return { candidates, skipped, warnings: Array.from(new Set(warnings)) };
}

export function updateIcsImportCandidate(preview: IcsImportPreview, candidateId: string, updates: Partial<Pick<IcsImportCandidate, "title" | "body" | "occurredAt" | "selected" | "recurrenceHandling">>): IcsImportPreview {
  return { ...preview, candidates: preview.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, ...updates } : candidate) };
}

export function selectedIcsImportCandidates(preview: IcsImportPreview) {
  return preview.candidates.filter((candidate) => candidate.selected);
}

export function getIcsOccurrenceImportPlan(preview: IcsImportPreview) {
  const candidates = selectedIcsImportCandidates(preview);
  const requested = candidates.flatMap((candidate) => {
    const count = Math.min(requestedOccurrenceCount(candidate), candidate.recurrenceOccurrences.length);
    return candidate.recurrenceOccurrences.slice(0, count).map((occurredAt, occurrenceIndex) => ({
      ...candidate,
      id: `${candidate.id}-occurrence-${occurrenceIndex + 1}`,
      occurredAt,
      recurrenceHandling: "base" as const,
    }));
  });
  return {
    candidates: requested.slice(0, MAX_ICS_CONFIRMED_OCCURRENCES),
    omittedCount: Math.max(0, requested.length - MAX_ICS_CONFIRMED_OCCURRENCES),
  };
}

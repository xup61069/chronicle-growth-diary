export type DiaryEventRevisionSnapshot = {
  occurredAt: number;
  datePrecision: "day" | "month" | "year";
  eventType: "memory" | "learning" | "achievement" | "chapter";
  title: string;
  body: string;
  ageLabel?: string | null;
  place?: string | null;
  color: string;
  isPublic: boolean;
  timelinePosition: number;
  tagNames: string[];
};

export function parseDiaryEventRevisionSnapshot(snapshot: string): DiaryEventRevisionSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new Error("這個版本快照已損毀，無法還原。");
  }
  if (
    !parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
    typeof (parsed as Record<string, unknown>).occurredAt !== "number" ||
    typeof (parsed as Record<string, unknown>).title !== "string" ||
    typeof (parsed as Record<string, unknown>).body !== "string" ||
    !Array.isArray((parsed as Record<string, unknown>).tagNames)
  ) {
    throw new Error("這個版本快照格式無效，無法還原。");
  }
  return parsed as DiaryEventRevisionSnapshot;
}

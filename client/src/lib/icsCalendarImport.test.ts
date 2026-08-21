import { parseIcsCalendar, selectedIcsImportCandidates, updateIcsImportCandidate } from "./icsCalendarImport";
import { describe, expect, it } from "vitest";
import { getIcsOccurrenceImportPlan } from "./icsCalendarImport";

describe("ICS calendar import", () => {
  it("projects only local-review fields from all-day, UTC and recurring VEVENT entries", () => {
    const preview = parseIcsCalendar([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:all-day-1",
      "SUMMARY:家庭旅行",
      "DESCRIPTION:只留下可編輯描述",
      "DTSTART;VALUE=DATE:20260823",
      "ATTENDEE:mailto:private@example.test",
      "URL:https://private.example.test/meeting",
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "END:VALARM",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:utc-2",
      "SUMMARY:看診",
      "DTSTART:20260824T013000Z",
      "RRULE:FREQ=WEEKLY",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n"));
    expect(preview.candidates.map(({ sourceUid, title, body, allDay, isRecurring }) => ({ sourceUid, title, body, allDay, isRecurring }))).toEqual([
      { sourceUid: "all-day-1", title: "家庭旅行", body: "只留下可編輯描述", allDay: true, isRecurring: false },
      { sourceUid: "utc-2", title: "看診", body: "", allDay: false, isRecurring: true },
    ]);
    expect(preview.warnings.join(" ")).toContain("提醒、受邀者、主辦人、會議網址、附件與重複規則不會帶入");
    expect(preview.warnings.join(" ")).toContain("預設只匯入起始事件");
    expect(preview.candidates[1]).toMatchObject({ recurrenceHandling: "base", recurrenceRule: "FREQ=WEEKLY" });
  });

  it("keeps invalid VEVENT entries visible as skipped and supports local title, date and selection edits", () => {
    const preview = parseIcsCalendar("BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:no-date\nSUMMARY:遺漏日期\nEND:VEVENT\nBEGIN:VEVENT\nUID:ok\nDTSTART;VALUE=DATE:20260825\nEND:VEVENT\nEND:VCALENDAR");
    expect(preview.skipped).toEqual([{ sourceUid: "no-date", reason: "缺少 DTSTART，無法建立時間軸草稿" }]);
    const updated = updateIcsImportCandidate(preview, preview.candidates[0]!.id, { title: "手動校正", occurredAt: new Date(2026, 7, 26).getTime(), selected: false });
    expect(selectedIcsImportCandidates(updated)).toEqual([]);
    expect(updated.candidates[0]).toMatchObject({ title: "手動校正", occurredAt: new Date(2026, 7, 26).getTime(), selected: false });
  });

  it("rejects malformed files before any candidate can be written", () => {
    expect(() => parseIcsCalendar("not an ics file")).toThrow("ICS");
  });

  it("expands a recurring entry only when the owner explicitly chooses a bounded option", () => {
    const preview = parseIcsCalendar("BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:weekly\nSUMMARY:每週晚餐\nDTSTART;VALUE=DATE:20260803\nRRULE:FREQ=WEEKLY\nEND:VEVENT\nEND:VCALENDAR");
    expect(getIcsOccurrenceImportPlan(preview).candidates).toHaveLength(1);
    const expanded = updateIcsImportCandidate(preview, preview.candidates[0]!.id, { recurrenceHandling: "next_4" });
    const plan = getIcsOccurrenceImportPlan(expanded);
    expect(plan).toMatchObject({ omittedCount: 0 });
    expect(plan.candidates.map((candidate) => candidate.occurredAt)).toHaveLength(4);
    expect(plan.candidates.map((candidate) => new Date(candidate.occurredAt).getDate())).toEqual([3, 10, 17, 24]);
  });

  it("never silently confirms more than the configured occurrence cap", () => {
    const base = parseIcsCalendar("BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:single\nDTSTART;VALUE=DATE:20260803\nEND:VEVENT\nEND:VCALENDAR");
    const candidate = base.candidates[0]!;
    const preview = { ...base, candidates: Array.from({ length: 251 }, (_, index) => ({ ...candidate, id: `item-${index}`, sourceUid: `uid-${index}` })) };
    expect(getIcsOccurrenceImportPlan(preview)).toMatchObject({ candidates: expect.any(Array), omittedCount: 1 });
    expect(getIcsOccurrenceImportPlan(preview).candidates).toHaveLength(250);
  });
});

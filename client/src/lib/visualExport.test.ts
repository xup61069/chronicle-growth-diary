import { getVisualExportRecord } from "./visualExport";
import { describe, expect, it } from "vitest";

describe("visual export records", () => {
  it("masks private capsule content before PDF or long-image rendering", () => {
    const record = getVisualExportRecord({
      id: 1, occurredAt: Date.UTC(2026, 0, 1), datePrecision: "day", ageLabel: "30 歲", title: "未來的秘密", body: "不可輸出的內容", place: "私人地點", color: "#EE623B", unlocksAt: Date.UTC(2027, 0, 1), tags: [{ id: 1, name: "秘密" }], media: [{ url: "https://example.test/private.jpg" }],
    }, Date.UTC(2026, 0, 1));

    expect(record).toMatchObject({ title: "時空膠囊鎖定中", body: "", ageLabel: null, place: null, media: [], tags: [], isTimeCapsuleLocked: true, capsule: { isLocked: true } });
  });
});

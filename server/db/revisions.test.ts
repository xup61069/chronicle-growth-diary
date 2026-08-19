import { describe, expect, it } from "vitest";
import { parseDiaryEventRevisionSnapshot } from "./revisions";

describe("事件版本快照", () => {
  const validSnapshot = JSON.stringify({ occurredAt: 1_704_067_200_000, datePrecision: "day", eventType: "memory", title: "第一次上台", body: "保留當時的感受", ageLabel: null, place: null, color: "#EE623B", isPublic: false, timelinePosition: 2, tagNames: ["成長"] });

  it("解析保留事件還原所需的結構", () => {
    expect(parseDiaryEventRevisionSnapshot(validSnapshot)).toMatchObject({ title: "第一次上台", isPublic: false, tagNames: ["成長"] });
  });

  it("拒絕損毀或缺少必要欄位的快照", () => {
    expect(() => parseDiaryEventRevisionSnapshot("{")).toThrow("快照已損毀");
    expect(() => parseDiaryEventRevisionSnapshot(JSON.stringify({ title: "缺少時間" }))).toThrow("快照格式無效");
  });
});

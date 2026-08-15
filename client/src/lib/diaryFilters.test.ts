import { filterDiaryEvents, type DiaryListFilters } from "./diaryFilters";
import { describe, expect, it } from "vitest";

const events = [
  { id: 1, occurredAt: new Date("2021-03-03T12:00:00").getTime(), eventType: "memory", title: "第一次旅行", body: "台南的街道", place: "台南", tags: [{ name: "家庭" }] },
  { id: 2, occurredAt: new Date("2023-09-01T12:00:00").getTime(), eventType: "learning", title: "開始學習設計", body: "完成第一個版面", place: "台北", tags: [{ name: "學習" }] },
  { id: 3, occurredAt: new Date("2022-06-15T12:00:00").getTime(), eventType: "achievement", title: "完成作品集", body: "成長紀錄", place: null, tags: [{ name: "學習" }, { name: "成就" }] },
];

const defaults: DiaryListFilters = { type: "all", tag: "all", search: "", dateFrom: "", dateTo: "", sortOrder: "custom" };

describe("filterDiaryEvents", () => {
  it("combines type, tag, text and inclusive date filters", () => {
    const result = filterDiaryEvents(events, { ...defaults, type: "learning", tag: "學習", search: "設計", dateFrom: "2023-01-01", dateTo: "2023-12-31" });
    expect(result.map((event) => event.id)).toEqual([2]);
  });

  it("searches titles, narratives, places and tags without mutating custom order", () => {
    expect(filterDiaryEvents(events, { ...defaults, search: "台南" }).map((event) => event.id)).toEqual([1]);
    expect(filterDiaryEvents(events, { ...defaults, search: "成就" }).map((event) => event.id)).toEqual([3]);
    expect(events.map((event) => event.id)).toEqual([1, 2, 3]);
  });

  it("sorts a copied result chronologically when requested", () => {
    expect(filterDiaryEvents(events, { ...defaults, sortOrder: "oldest" }).map((event) => event.id)).toEqual([1, 3, 2]);
    expect(filterDiaryEvents(events, { ...defaults, sortOrder: "newest" }).map((event) => event.id)).toEqual([2, 3, 1]);
  });
});

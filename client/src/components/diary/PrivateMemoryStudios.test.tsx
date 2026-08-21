import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FutureLettersStudio, MonthlyDigestStudio, OnThisDayStudio, RecallCheckStudio } from "./PrivateMemoryStudios";

describe("private memory studios", () => {
  it("keeps locked titles masked and retains private-only controls and copy", () => {
    const onThisDay = renderToStaticMarkup(<OnThisDayStudio isLoading={false} memories={[{ id: 1, yearsAgo: 3, isLocked: true, daysRemaining: 4, occurredAt: Date.UTC(2023, 0, 1), eventType: "memory", title: "不可顯示的回憶" }]} onOpen={() => undefined} />);
    const recall = renderToStaticMarkup(<RecallCheckStudio enabled={false} isLoading={false} isUpdating={false} isRunning={false} lastCheckLabel="尚未檢查" statusLabel="尚未建立每日檢查紀錄。" onSetEnabled={() => undefined} onRunNow={() => undefined} />);
    const letters = renderToStaticMarkup(<FutureLettersStudio letters={[{ id: 2, unlocksAt: Date.UTC(2030, 0, 1), isLocked: true, daysRemaining: 999, title: null, isSoon: false }]} onOpen={() => undefined} />);
    const monthly = renderToStaticMarkup(<MonthlyDigestStudio digest={{ title: "2026 年 1 月摘要", year: 2026, month: 1, count: 1, lockedCount: 0, availableCount: 1, typeCounts: { memory: 1, learning: 0, achievement: 0, chapter: 0 }, tags: ["私人"], events: [], lead: "本月共整理 1 段私人事件。" }} months={[{ year: 2026, month: 1 }]} activeMonthKey="2026-01" onMonthChange={() => undefined} onPrint={() => undefined} />);

    expect(onThisDay).toContain("時空膠囊尚未解鎖");
    expect(onThisDay).not.toContain("不可顯示的回憶");
    expect(recall).toContain("不寄送 Email、不推播");
    expect(recall).toContain('disabled=""');
    expect(letters).toContain("解鎖前不顯示信件標題或內容");
    expect(monthly).toContain("本月共整理 1 段私人事件。");
    expect(monthly).toContain("#私人");
  });
});

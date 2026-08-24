import { describe, expect, it } from "vitest";
import { assertRestorableAnnualSurveys, buildFullArchiveRestoreAttachmentRows, fullArchiveRestoreInput } from "./archiveRestore";

const input = fullArchiveRestoreInput.parse({
  data: {
    format: "chronicle-growth-diary-full",
    version: 1,
    diary: { title: "家庭成長史", publicCoverAssetId: null },
    tags: [],
    events: [{
      archiveId: "event-1", occurredAt: 1_700_000_000_000, datePrecision: "day", eventType: "memory", title: "第一次旅行", body: "記下路上的事。",
      media: [{ assetId: "event-1-media-1", mediaKind: "image", fileName: "trip.jpg", mimeType: "image/jpeg", caption: null, sortOrder: 0 }],
      voiceNotes: [],
    }],
    reflections: [],
    revisions: [],
    annualSurveys: [{
      title: "家庭年度問卷",
      targetMonth: 12,
      targetDay: 31,
      questions: [{ archiveQuestionId: "survey-question-1", prompt: "今年最想記住什麼？", position: 0 }],
      answers: [{ archiveQuestionId: "survey-question-1", year: 2026, body: "留下這段回答。", bodies: ["第一位匿名回答。", "第二位匿名回答。"] }],
    }],
  },
  assets: [{ id: "event-1-media-1", kind: "image", fileName: "trip.jpg", mimeType: "image/jpeg", byteLength: 9, sha256: "a".repeat(64) }],
});

describe("全量封存還原附件契約", () => {
  it("只建立與已驗證事件媒體一對一對應的 private staging 描述", () => {
    expect(buildFullArchiveRestoreAttachmentRows(input)).toEqual([
      expect.objectContaining({ assetId: "event-1-media-1", eventArchiveId: "event-1", byteLength: 9, sha256: "a".repeat(64), kind: "image" }),
    ]);
  });

  it("拒絕不屬於事件或封面的未指派附件", () => {
    const unsafe = fullArchiveRestoreInput.parse({ ...input, assets: [...input.assets, { id: "orphan-asset", kind: "image", fileName: "orphan.jpg", mimeType: "image/jpeg", byteLength: 1, sha256: "b".repeat(64) }] });
    expect(() => buildFullArchiveRestoreAttachmentRows(unsafe)).toThrow("未指派");
  });

  it("接受去識別化年度題組並拒絕指向不存在題目的回答", () => {
    expect(input.data.annualSurveys[0]?.answers[0]?.archiveQuestionId).toBe("survey-question-1");
    expect(() => assertRestorableAnnualSurveys(input.data.annualSurveys)).not.toThrow();
    expect(() => assertRestorableAnnualSurveys([{
      ...input.data.annualSurveys[0]!,
      answers: [{ archiveQuestionId: "missing-question", year: 2026, body: "不應還原。" }],
    }])).toThrow("不屬於目前題組");
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivateBackfillAssistant } from "./PrivateBackfillAssistant";

describe("PrivateBackfillAssistant", () => {
  it("shows only a private date gap and browser-local pending photo count", () => {
    const html = renderToStaticMarkup(<PrivateBackfillAssistant snapshot={{ daysSinceLatestEvent: 12, latestEventOccurredAt: Date.parse("2026-08-10T00:00:00.000Z"), pendingPhotoCount: 34, needsNudge: true }} onChoosePhotos={() => undefined} />);

    expect(html).toContain("12 天沒有留下事件");
    expect(html).toContain("目前這批有 34 張照片尚未整理");
    expect(html).toContain("不讀取事件內容、不上傳照片、不建立通知或排程");
    expect(html).toContain("選擇 JPEG 照片");
    expect(html).not.toContain("2026-08-10");
  });
});

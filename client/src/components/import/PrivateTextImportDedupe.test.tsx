import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivateTextImportDedupe } from "./PrivateTextImportDedupe";

describe("PrivateTextImportDedupe", () => {
  it("explains the current-preview, title-only local boundary before explicit review", () => {
    const markup = renderToStaticMarkup(<PrivateTextImportDedupe items={[{ id: "one", title: "旅行台北", occurredAt: Date.parse("2026-08-23T01:00:00.000Z") }, { id: "two", title: "旅行 台北", occurredAt: Date.parse("2026-08-23T02:00:00.000Z") }]} selectedIds={["one", "two"]} disabled={false} onExclude={() => undefined} onKeep={() => undefined} />);
    expect(markup).toContain("以本機短標題／UTC 日期檢查");
    expect(markup).toContain("不會讀正文、上傳、保存或查看既有日記");
    expect(markup).not.toContain("相同短標題與 UTC 日期候選");
  });
});

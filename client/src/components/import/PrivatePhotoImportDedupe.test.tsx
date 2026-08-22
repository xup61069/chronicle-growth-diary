import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivatePhotoImportDedupe } from "./PrivatePhotoImportDedupe";

function localFile(name: string, size: number, lastModified = 1) {
  return { name, size, type: "image/jpeg", lastModified, arrayBuffer: async () => new ArrayBuffer(0) } as File;
}

describe("PrivatePhotoImportDedupe", () => {
  it("renders only current-file candidate controls and explains the local boundary", () => {
    const markup = renderToStaticMarkup(<PrivatePhotoImportDedupe photos={[{ id: "one", file: localFile("same.jpg", 12) }, { id: "two", file: localFile("same.jpg", 12) }]} excludedPhotoIds={[]} disabled={false} onExclude={() => undefined} onKeep={() => undefined} />);
    expect(markup).toContain("目前選取檔案");
    expect(markup).toContain("不會上傳、保存或與既有日記比較");
    expect(markup).toContain("以本機 dHash 尋找近似圖片");
    expect(markup).toContain("略過後續 1 張");
    expect(markup).not.toContain("既有事件內容");
  });
});

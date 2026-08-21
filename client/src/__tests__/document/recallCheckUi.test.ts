import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const editor = readFileSync(resolve(process.cwd(), "client/src/pages/DiaryEditor.tsx"), "utf8");
const studios = readFileSync(resolve(process.cwd(), "client/src/components/PrivateMemoryStudios.tsx"), "utf8");

describe("recall check UI privacy contract", () => {
  it("keeps the owner-only daily check default-off and states the no-delivery boundary", () => {
    expect(studios).toContain("DAILY RECALL CHECK / OWNER ONLY");
    expect(studios).toContain("每天自動檢查");
    expect(studios).toContain("預設關閉");
    expect(studios).toContain("不寄送 Email、不推播、不保存日記內容、標題、照片或地點");
    expect(editor).toContain("recallChecks.getPreferences");
    expect(editor).toContain("recallChecks.setPreferences");
    expect(editor).toContain("<RecallCheckStudio");
  });
});

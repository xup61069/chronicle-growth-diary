import { describe, expect, it } from "vitest";
import { canEditFamilyDiary, canManageAnnualReview, canManageFamilyDiarySettings, describeFamilyAuditAction } from "./familyCollaboration";

describe("家庭共寫權限與稽核文案", () => {
  it("只允許擁有者與共同編輯者修改日記", () => {
    expect(canEditFamilyDiary("owner")).toBe(true);
    expect(canEditFamilyDiary("editor")).toBe(true);
    expect(canEditFamilyDiary("commenter")).toBe(false);
  });

  it("只允許擁有者修改日記範圍與 AI 等設定", () => {
    expect(canManageFamilyDiarySettings("owner")).toBe(true);
    expect(canManageFamilyDiarySettings("editor")).toBe(false);
    expect(canManageFamilyDiarySettings("commenter")).toBe(false);
  });

  it("只允許擁有者生成或匯出私有年度回顧", () => {
    expect(canManageAnnualReview("owner")).toBe(true);
    expect(canManageAnnualReview("editor")).toBe(false);
    expect(canManageAnnualReview("commenter")).toBe(false);
  });

  it("為角色調整顯示正確的稽核紀錄文案", () => {
    expect(describeFamilyAuditAction("member_role_updated")).toBe("調整成員角色");
    expect(describeFamilyAuditAction("comment_created")).toBe("發表註解");
  });
});

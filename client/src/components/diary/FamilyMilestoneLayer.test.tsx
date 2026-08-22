import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FamilyMilestoneLayer } from "./FamilyMilestoneLayer";

const ownerProps = {
  milestones: [{ id: 41, occurredAt: Date.parse("2026-08-22T00:00:00.000Z"), datePrecision: "day" as const, title: "匿名家庭節點", summary: "不可出現在稽核區的私人摘要", audienceMode: "selected_members" as const, audienceMemberIds: [7], updatedAt: "2026-08-22T00:00:00.000Z" }],
  canManage: true,
  sourceEvents: [],
  familyMembers: [{ id: 7, name: "匿名成員", email: "member@example.test", role: "commenter" as const }],
  audienceAudit: [{ id: 51, action: "family_milestone_audience_updated", targetId: 41, createdAt: "2026-08-22T01:00:00.000Z" }],
  audienceAuditRange: { fromDate: "", toDate: "" },
  audienceAuditRangeError: null,
  onAudienceAuditRangeChange: () => undefined,
  isLoadingAudienceAudit: false,
  isSaving: false,
  onCreate: async () => undefined,
  onUpdate: async () => undefined,
  onDelete: async () => undefined,
};

describe("FamilyMilestoneLayer", () => {
  it("keeps the owner audit projection limited to time, fixed action and milestone id", () => {
    const html = renderToStaticMarkup(<FamilyMilestoneLayer {...ownerProps} />);
    const auditMarkup = html.slice(html.indexOf("查看已確認的受眾異動"));

    expect(auditMarkup).toContain("僅顯示時間、動作與大事記識別碼");
    expect(auditMarkup).toContain("大事記 #41");
    expect(auditMarkup).toContain("開始日期");
    expect(auditMarkup).toContain("結束日期");
    expect(auditMarkup).not.toContain("不可出現在稽核區的私人摘要");
    expect(auditMarkup).not.toContain("匿名成員");
    expect(auditMarkup).not.toContain("member@example.test");
  });

  it("does not render owner controls or the audience audit panel for a read-only family member", () => {
    const html = renderToStaticMarkup(<FamilyMilestoneLayer {...ownerProps} canManage={false} />);

    expect(html).toContain("family-only 閱讀");
    expect(html).not.toContain("查看已確認的受眾異動");
    expect(html).not.toContain("編輯");
    expect(html).not.toContain("刪除");
  });
});

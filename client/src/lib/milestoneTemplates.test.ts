import { describe, expect, it } from "vitest";
import { makeEmptyForm } from "./diaryEditor";
import { applyMilestoneTemplate, milestoneTemplates } from "./milestoneTemplates";

describe("milestone templates", () => {
  it("provides private, editable growth prompts without inventing an event date or sharing scope", () => {
    const template = milestoneTemplates.find((item) => item.key === "new-skill")!;
    const form = { ...makeEmptyForm(), occurredAt: "2026-08-20", place: "客廳", shareScope: "private" as const, body: "今天先試了一次。", tagNames: ["家庭"] };
    const applied = applyMilestoneTemplate(form, template);
    expect(applied).toMatchObject({ occurredAt: "2026-08-20", place: "客廳", shareScope: "private", title: "開始練習＿＿＿", eventType: "learning", track: "skills", milestoneType: "standard" });
    expect(applied.body).toContain("今天先試了一次。\n\n為什麼想開始？");
    expect(applied.tagNames).toEqual(["家庭", "成長節點", "練習"]);
  });

  it("caps merged tags and keywords while allowing the user to overwrite every suggestion", () => {
    const template = milestoneTemplates.find((item) => item.key === "new-chapter")!;
    const form = { ...makeEmptyForm(), tagNames: ["1", "2", "3", "4", "5", "6", "7"], phaseKeywords: ["a", "b", "c", "d", "e", "f", "g"] };
    const applied = applyMilestoneTemplate(form, template);
    expect(applied.tagNames).toHaveLength(8);
    expect(applied.phaseKeywords).toHaveLength(8);
  });
});

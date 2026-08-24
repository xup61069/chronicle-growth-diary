import { describe, expect, it } from "vitest";
import { deidentifyAnnualSurveyAnswers } from "./fullDiaryArchive";

describe("de-identified annual survey archive", () => {
  it("keeps every same-year response without exporting a family identity", () => {
    expect(deidentifyAnnualSurveyAnswers([
      { questionId: 8, year: 2025, body: "第一份回答" },
      { questionId: 8, year: 2025, body: "第二份回答" },
      { questionId: 8, year: 2026, body: "隔年回答" },
    ])).toEqual([
      { questionId: 8, year: 2025, bodies: ["第一份回答", "第二份回答"] },
      { questionId: 8, year: 2026, bodies: ["隔年回答"] },
    ]);
  });
});

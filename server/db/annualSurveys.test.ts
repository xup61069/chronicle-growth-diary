import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createAnnualSurveyForDiary,
  DEFAULT_ANNUAL_SURVEY_QUESTIONS,
  saveAnnualSurveyAnswerForDiary,
} from "./annualSurveys";

describe("annual survey privacy and access", () => {
  it("creates the owner question set with ten defaults and a disabled reminder preference", async () => {
    const setValues = vi.fn().mockResolvedValue(undefined);
    const questionValues = vi.fn().mockResolvedValue(undefined);
    const tx = {
      insert: vi.fn()
        .mockReturnValueOnce({ values: setValues })
        .mockReturnValueOnce({ values: questionValues }),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 42 }]) })),
          })),
        })),
      })),
    };
    const db = { transaction: async (work: (transaction: typeof tx) => unknown) => work(tx) } as never;

    await expect(createAnnualSurveyForDiary(db, 7, 12)).resolves.toEqual({ id: 42, remindersEnabled: false });
    expect(setValues).toHaveBeenCalledWith(expect.objectContaining({ diaryId: 7, createdByUserId: 12, remindersEnabled: false }));
    expect(questionValues.mock.calls[0]?.[0]).toHaveLength(DEFAULT_ANNUAL_SURVEY_QUESTIONS.length);
  });

  it("rejects a cross-diary answer before selecting a question or inserting answer content", async () => {
    const select = vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) }));
    const insert = vi.fn();
    await expect(saveAnnualSurveyAnswerForDiary({ select, insert } as never, { diaryId: 7, userId: 12, role: "commenter" }, {
      surveyId: 44,
      questionId: 55,
      year: 2026,
      body: "合成回答",
    })).rejects.toThrow("找不到這份家庭年度問卷");
    expect(select).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
  });

  it("allows an accepted family member to save a personal answer without changing the owner-only question set", async () => {
    const values = vi.fn(() => ({
      onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
    }));
    const select = vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 44 }]) })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 55 }]) })),
        })),
      });
    const db = { select, insert: vi.fn(() => ({ values })) } as never;

    await expect(saveAnnualSurveyAnswerForDiary(db, { diaryId: 7, userId: 19, role: "commenter" }, {
      surveyId: 44,
      questionId: 55,
      year: 2025,
      body: "成員留下的回答",
    })).resolves.toMatchObject({ surveyId: 44, questionId: 55, year: 2025 });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ authorUserId: 19, body: "成員留下的回答" }));
  });

  it("keeps survey records out of public and link sharing projections while retaining a de-identified owner archive section", () => {
    const sharing = readFileSync(resolve(process.cwd(), "server/db/sharing.ts"), "utf8");
    const archive = readFileSync(resolve(process.cwd(), "server/db/fullDiaryArchive.ts"), "utf8");
    expect(sharing).not.toContain("growthAnnualSurvey");
    expect(archive).toContain("annualSurveys");
    expect(archive).not.toContain("authorUserId: answer.authorUserId");
  });
});

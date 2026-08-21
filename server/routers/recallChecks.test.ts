import { beforeEach, describe, expect, it, vi } from "vitest";

const recallDb = vi.hoisted(() => ({
  getDiaryRecallPreferences: vi.fn(async () => ({ enabled: false, timezoneOffsetMinutes: -480, scheduleCronTaskUid: null })),
  updateDiaryRecallPreferences: vi.fn(async (_userId: number, input: { enabled: boolean; timezoneOffsetMinutes: number }) => ({ ...input, scheduleCronTaskUid: "task-recall-123" })),
  setDiaryRecallScheduleTask: vi.fn(async (_userId: number, taskUid: string | null) => ({ enabled: true, timezoneOffsetMinutes: -480, scheduleCronTaskUid: taskUid })),
  runDiaryRecallCheck: vi.fn(async () => ({ onThisDayCount: 1, futureLetterCount: 0, status: "checked_items" })),
}));
const heartbeat = vi.hoisted(() => ({
  createHeartbeatJob: vi.fn(async () => ({ taskUid: "task-recall-123" })),
  updateHeartbeatJob: vi.fn(async () => ({})),
}));

vi.mock("../db", () => recallDb);
vi.mock("../_core/heartbeat", () => heartbeat);
vi.mock("../_core/env", () => ({ ENV: { isProduction: true } }));

import { recallChecksRouter } from "./recallChecks";

const context = {
  user: { id: 7, openId: "owner", name: "Owner", email: "owner@example.test", loginMethod: "local", passwordHash: null, emailVerified: false, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { headers: { cookie: "app_session_id=session-token" } },
  res: {},
} as any;

describe("recall checks router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a daily content-free platform task only after the owner explicitly enables checks", async () => {
    const caller = recallChecksRouter.createCaller(context);
    await expect(caller.setPreferences({ enabled: true, timezoneOffsetMinutes: -480 })).resolves.toMatchObject({ scheduleCronTaskUid: "task-recall-123" });
    expect(heartbeat.createHeartbeatJob).toHaveBeenCalledWith(expect.objectContaining({
      cron: "0 15 0 * * *",
      path: "/api/scheduled/recall-check",
      description: expect.stringContaining("without external delivery"),
    }), "session-token");
    expect(recallDb.setDiaryRecallScheduleTask).toHaveBeenCalledWith(7, "task-recall-123");
  });

  it("pauses an existing task before saving the owner-selected disabled state", async () => {
    recallDb.getDiaryRecallPreferences.mockResolvedValueOnce({ enabled: true, timezoneOffsetMinutes: -480, scheduleCronTaskUid: "task-recall-123" });
    const caller = recallChecksRouter.createCaller(context);
    await caller.setPreferences({ enabled: false, timezoneOffsetMinutes: 0 });
    expect(heartbeat.updateHeartbeatJob).toHaveBeenCalledWith("task-recall-123", { enable: false }, "session-token");
    expect(recallDb.updateDiaryRecallPreferences).toHaveBeenCalledWith(7, { enabled: false, timezoneOffsetMinutes: 0 });
  });

  it("refuses manual checks until the owner has explicitly enabled the feature", async () => {
    const caller = recallChecksRouter.createCaller(context);
    await expect(caller.runNow({ timezoneOffsetMinutes: -480 })).rejects.toThrow("請先開啟每日回憶檢查");
    expect(recallDb.runDiaryRecallCheck).not.toHaveBeenCalled();
  });
});

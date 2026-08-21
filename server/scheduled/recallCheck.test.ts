import { beforeEach, describe, expect, it, vi } from "vitest";

const recallDb = vi.hoisted(() => ({
  runDiaryRecallCheckByTaskUid: vi.fn(async () => ({ onThisDayCount: 2, futureLetterCount: 1, status: "checked_items" })),
}));
const auth = vi.hoisted(() => ({
  authenticateRequest: vi.fn(async () => ({ isCron: true, taskUid: "task-recall-123" })),
}));

vi.mock("../db", () => recallDb);
vi.mock("../_core/sdk", () => ({ sdk: auth }));

import { handleRecallCheck } from "./recallCheck";

function response() {
  const state = { statusCode: 200, body: undefined as unknown };
  return {
    state,
    status(code: number) { state.statusCode = code; return this; },
    json(body: unknown) { state.body = body; return this; },
  } as any;
}

describe("scheduled recall check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts only an authenticated cron and returns no title, body, media, location, or count", async () => {
    const res = response();
    await handleRecallCheck({} as any, res);
    expect(recallDb.runDiaryRecallCheckByTaskUid).toHaveBeenCalledWith("task-recall-123");
    expect(res.state).toEqual({ statusCode: 200, body: { ok: true, status: "checked_items", delivery: "none" } });
    expect(JSON.stringify(res.state.body)).not.toMatch(/title|body|media|location|count/i);
  });

  it("rejects a non-cron caller before reading any recall preference", async () => {
    auth.authenticateRequest.mockResolvedValueOnce({ isCron: false });
    const res = response();
    await handleRecallCheck({} as any, res);
    expect(res.state).toEqual({ statusCode: 403, body: { error: "cron-only" } });
    expect(recallDb.runDiaryRecallCheckByTaskUid).not.toHaveBeenCalled();
  });

  it("treats a paused, deleted, or unmatched task as an idempotent no-op", async () => {
    recallDb.runDiaryRecallCheckByTaskUid.mockResolvedValueOnce(null);
    const res = response();
    await handleRecallCheck({} as any, res);
    expect(res.state).toEqual({ statusCode: 200, body: { ok: true, skipped: "orphan_or_disabled", delivery: "none" } });
  });

  it("returns a machine-readable 500 when the private check cannot complete", async () => {
    recallDb.runDiaryRecallCheckByTaskUid.mockRejectedValueOnce(new Error("database unavailable"));
    const res = response();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await handleRecallCheck({} as any, res);
      expect(res.state).toEqual({ statusCode: 500, body: { error: "recall-check-failed" } });
      expect(JSON.stringify(res.state.body)).not.toContain("database unavailable");
      expect(errorSpy).toHaveBeenCalledWith("[Recall check] callback failed", {
        path: "/api/scheduled/recall-check",
        error: "database unavailable",
      });
    } finally {
      errorSpy.mockRestore();
    }
  });
});

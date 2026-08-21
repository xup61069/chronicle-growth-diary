import type { Request, Response } from "express";
import { runDiaryRecallCheckByTaskUid } from "../db";
import { sdk } from "../_core/sdk";

/**
 * Heartbeat callback. The platform-authenticated task UID, never a request
 * body field, selects the owner preference. The response intentionally omits
 * diary data and even event counts; counts remain owner-visible state only.
 */
export async function handleRecallCheck(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await runDiaryRecallCheckByTaskUid(user.taskUid);
    if (!result) return res.json({ ok: true, skipped: "orphan_or_disabled", delivery: "none" });
    return res.json({ ok: true, status: result.status, delivery: "none" });
  } catch {
    console.error("[Recall check] callback failed", {
      operation: "scheduled_recall_check",
      code: "recall-check-failed",
    });
    return res.status(500).json({ error: "recall-check-failed" });
  }
}

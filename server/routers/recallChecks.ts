import { parse as parseCookie } from "cookie";
import { z } from "zod";
import {
  getDiaryRecallPreferences,
  runDiaryRecallCheck,
  setDiaryRecallScheduleTask,
  updateDiaryRecallPreferences,
} from "../db";
import { ENV } from "../_core/env";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { protectedProcedure, router } from "../_core/trpc";
import { COOKIE_NAME } from "../../shared/const";

const dailyRecallCron = "0 15 0 * * *";

function sessionTokenFromCookie(header: string | undefined) {
  return parseCookie(header ?? "")[COOKIE_NAME] ?? "";
}

function recallCheckRequest(timezoneOffsetMinutes: number, now = Date.now()) {
  const local = new Date(now - timezoneOffsetMinutes * 60_000);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    timezoneOffsetMinutes,
  };
}

export const recallChecksRouter = router({
  getPreferences: protectedProcedure.query(({ ctx }) => getDiaryRecallPreferences(ctx.user.id)),
  setPreferences: protectedProcedure.input(z.object({
    enabled: z.boolean(),
    timezoneOffsetMinutes: z.number().int().min(-840).max(840),
  })).mutation(async ({ ctx, input }) => {
    const current = await getDiaryRecallPreferences(ctx.user.id);
    const sessionToken = sessionTokenFromCookie(ctx.req.headers.cookie);

    if (input.enabled && !ENV.isProduction) {
      throw new Error("每日回憶檢查必須在網站發布後才能開啟；開發預覽不會建立排程。 ");
    }

    if (input.enabled) {
      if (current.scheduleCronTaskUid) {
        await updateHeartbeatJob(current.scheduleCronTaskUid, { enable: true }, sessionToken);
        return updateDiaryRecallPreferences(ctx.user.id, input);
      }
      const job = await createHeartbeatJob({
        name: `chronicle-recall-${ctx.user.id}`,
        cron: dailyRecallCron,
        path: "/api/scheduled/recall-check",
        description: "Daily private recall eligibility check without external delivery",
      }, sessionToken);
      await setDiaryRecallScheduleTask(ctx.user.id, job.taskUid);
      return updateDiaryRecallPreferences(ctx.user.id, input);
    }

    if (current.scheduleCronTaskUid) {
      await updateHeartbeatJob(current.scheduleCronTaskUid, { enable: false }, sessionToken);
    }
    return updateDiaryRecallPreferences(ctx.user.id, input);
  }),
  runNow: protectedProcedure.input(z.object({ timezoneOffsetMinutes: z.number().int().min(-840).max(840) })).mutation(async ({ ctx, input }) => {
    const preference = await getDiaryRecallPreferences(ctx.user.id);
    if (!preference.enabled) throw new Error("請先開啟每日回憶檢查，再手動執行檢查。 ");
    return runDiaryRecallCheck(ctx.user.id, recallCheckRequest(input.timezoneOffsetMinutes));
  }),
});

export { recallCheckRequest };

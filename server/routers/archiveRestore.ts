import { z } from "zod";
import { cancelFullArchiveRestore, commitFullArchiveRestore, prepareFullArchiveRestore, stageFullArchiveRestoreAsset } from "../db";
import { fullArchiveRestoreInput } from "../db/archiveRestore";
import { protectedProcedure, router } from "../_core/trpc";

export const archiveRestoreRouter = router({
  prepare: protectedProcedure.input(fullArchiveRestoreInput).mutation(({ ctx, input }) => prepareFullArchiveRestore(ctx.user.id, input)),
  stageAsset: protectedProcedure.input(z.object({ restoreId: z.string().uuid(), assetId: z.string().regex(/^[-a-zA-Z0-9]+$/).max(128), base64: z.string().min(1).max(22_500_000) })).mutation(({ ctx, input }) => stageFullArchiveRestoreAsset(ctx.user.id, input)),
  commit: protectedProcedure.input(z.object({ restoreId: z.string().uuid(), confirmation: z.string().trim().refine((value) => value === "還原我的成長史", "請輸入「還原我的成長史」以確認取代目前日記。") })).mutation(({ ctx, input }) => commitFullArchiveRestore(ctx.user.id, input.restoreId)),
  cancel: protectedProcedure.input(z.object({ restoreId: z.string().uuid() })).mutation(({ ctx, input }) => cancelFullArchiveRestore(ctx.user.id, input.restoreId)),
});

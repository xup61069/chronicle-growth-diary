import { getGrowthDashboardStats } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

/** Private, owner-only aggregates for the personal growth dashboard. */
export const statsRouter = router({
  growth: protectedProcedure.query(({ ctx }) => getGrowthDashboardStats(ctx.user.id)),
});

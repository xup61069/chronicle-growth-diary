import { z } from "zod";
import { makeStaticMapDataUrl } from "../_core/map";
import { protectedProcedure, router } from "../_core/trpc";

const coordinateInput = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

/** Maps are user-triggered preview helpers only; no address lookup or location metadata is persisted here. */
export const photoMapRouter = router({
  preview: protectedProcedure.input(coordinateInput).mutation(async ({ input }) => ({
    dataUrl: await makeStaticMapDataUrl({ latitude: input.latitude, longitude: input.longitude }),
  })),
});

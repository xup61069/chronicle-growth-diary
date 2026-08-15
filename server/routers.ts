import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import {
  createDiaryEvent,
  deleteDiaryEvent,
  deleteDiaryEventMedia,
  generatePhaseReflection,
  getDiarySnapshot,
  getSharedDiary,
  reorderDiaryEvents,
  reorderDiaryEventMedia,
  setDiaryEventVisibility,
  updateDiaryPhaseBoundaries,
  updateDiaryEvent,
  updateDiaryEventMedia,
  updatePhaseReflection,
  updateDiarySharing,
  uploadDiaryCoverImage,
  uploadDiaryEventImage,
} from "./db";
import { EVENT_COLORS, EVENT_TYPES, isSupportedImageMimeType } from "./diaryHelpers";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createLocalUser, getUserByEmail } from "./db";
import { hashLocalPassword, localOpenIdForEmail, normalizeLocalEmail, verifyLocalPassword } from "./localCredentials";
import { getAuthProvider } from "./providers/auth";

const localCredentialInput = z.object({
  email: z.string().trim().email("請輸入有效的 email。").max(320),
  password: z.string().min(12, "密碼至少需要 12 個字元。").max(128),
});

function assertLocalAuthEnabled() {
  if (ENV.authDriver !== "local") {
    throw new Error("本機帳密登入未啟用。請設定 AUTH_DRIVER=local。");
  }
}

async function startLocalSession(
  ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: Function } },
  user: { openId: string; name: string | null }
) {
  const token = await getAuthProvider().createSessionToken(user.openId, {
    name: user.name ?? "",
  });
  ctx.res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });
}

const diaryEventInput = z.object({
  occurredAt: z.number().int().min(-2208988800000).max(4102444800000),
  datePrecision: z.enum(["day", "month", "year"]),
  eventType: z.enum(EVENT_TYPES),
  title: z.string().trim().min(1, "請為這段記憶寫下標題。").max(180),
  body: z.string().trim().max(8000),
  ageLabel: z.string().trim().max(80).optional().nullable(),
  place: z.string().trim().max(180).optional().nullable(),
  color: z.enum(EVENT_COLORS),
  tagNames: z.array(z.string().trim().max(24)).max(8),
});

const year = z.number().int().min(1900).max(2200).nullable().optional();

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    localRegister: publicProcedure.input(localCredentialInput.extend({ name: z.string().trim().min(1, "請輸入顯示名稱。").max(100) })).mutation(async ({ ctx, input }) => {
      assertLocalAuthEnabled();
      const email = normalizeLocalEmail(input.email);
      if (await getUserByEmail(email)) {
        throw new Error("此 email 已被使用，請改用登入。 ");
      }
      const user = await createLocalUser({
        openId: localOpenIdForEmail(email),
        email,
        name: input.name,
        passwordHash: hashLocalPassword(input.password),
      });
      await startLocalSession(ctx, user);
      return user;
    }),
    localLogin: publicProcedure.input(localCredentialInput).mutation(async ({ ctx, input }) => {
      assertLocalAuthEnabled();
      const user = await getUserByEmail(normalizeLocalEmail(input.email));
      if (!user || user.loginMethod !== "local" || !verifyLocalPassword(input.password, user.passwordHash)) {
        throw new Error("email 或密碼不正確。");
      }
      await startLocalSession(ctx, user);
      return user;
    }),
  }),
  diary: router({
    get: protectedProcedure.query(({ ctx }) => getDiarySnapshot(ctx.user.id)),
    createEvent: protectedProcedure.input(diaryEventInput).mutation(({ ctx, input }) => createDiaryEvent(ctx.user.id, input)),
    updateEvent: protectedProcedure.input(diaryEventInput.extend({ id: z.number().int().positive() })).mutation(({ ctx, input }) => {
      const { id, ...event } = input;
      return updateDiaryEvent(ctx.user.id, id, event);
    }),
    deleteEvent: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteDiaryEvent(ctx.user.id, input.id)),
    setEventVisibility: protectedProcedure.input(z.object({ id: z.number().int().positive(), isPublic: z.boolean() })).mutation(({ ctx, input }) => setDiaryEventVisibility(ctx.user.id, input.id, input.isPublic)),
    reorderEvents: protectedProcedure.input(z.object({ eventIds: z.array(z.number().int().positive()).max(500) })).mutation(({ ctx, input }) => reorderDiaryEvents(ctx.user.id, input.eventIds)),
    updatePhaseBoundaries: protectedProcedure.input(z.object({
      childhoodStartYear: year,
      childhoodEndYear: year,
      educationStartYear: year,
      educationEndYear: year,
      careerStartYear: year,
      careerEndYear: year,
    })).mutation(({ ctx, input }) => updateDiaryPhaseBoundaries(ctx.user.id, input)),
    generatePhaseReflection: protectedProcedure.input(z.object({ phaseKey: z.enum(["childhood", "education", "career"]) })).mutation(({ ctx, input }) => generatePhaseReflection(ctx.user.id, input.phaseKey)),
    updatePhaseReflection: protectedProcedure.input(z.object({ phaseKey: z.enum(["childhood", "education", "career"]), recap: z.string().trim().min(1).max(3000), reflection: z.string().trim().min(1).max(3000) })).mutation(({ ctx, input }) => updatePhaseReflection(ctx.user.id, input)),
    updateSharing: protectedProcedure.input(z.object({
      shareMode: z.enum(["private", "public", "link"]),
      birthYear: year,
      educationStartYear: year,
      careerStartYear: year,
      childhoodStartYear: year,
      childhoodEndYear: year,
      educationEndYear: year,
      careerEndYear: year,
      sharePassword: z.string().min(8, "分享密碼至少需要 8 個字元。").max(128).nullable().optional(),
      clearSharePassword: z.boolean().optional(),
      shareExpiresAt: z.number().int().min(0).max(4102444800000).nullable().optional(),
      regenerateLink: z.boolean().optional(),
      publicCoverTitle: z.string().trim().max(160).nullable().optional(),
      publicStoryLayout: z.enum(["editorial", "gallery", "minimal"]).optional(),
      clearPublicCover: z.boolean().optional(),
    })).mutation(({ ctx, input }) => updateDiarySharing(ctx.user.id, input)),
    uploadImage: protectedProcedure.input(z.object({
      eventId: z.number().int().positive(),
      fileName: z.string().trim().min(1).max(180),
      mimeType: z.string().trim().refine(isSupportedImageMimeType, "只支援 JPG、PNG、WebP 或 GIF 圖片。"),
      base64: z.string().min(1).max(6_000_000),
      caption: z.string().trim().max(240).optional(),
    })).mutation(({ ctx, input }) => uploadDiaryEventImage({ userId: ctx.user.id, ...input })),
    updateImage: protectedProcedure.input(z.object({ id: z.number().int().positive(), caption: z.string().trim().max(240).nullable() })).mutation(({ ctx, input }) => updateDiaryEventMedia(ctx.user.id, input.id, input.caption)),
    reorderImages: protectedProcedure.input(z.object({ eventId: z.number().int().positive(), mediaIds: z.array(z.number().int().positive()).max(100) })).mutation(({ ctx, input }) => reorderDiaryEventMedia(ctx.user.id, input.eventId, input.mediaIds)),
    uploadCoverImage: protectedProcedure.input(z.object({
      fileName: z.string().trim().min(1).max(180),
      mimeType: z.string().trim().refine(isSupportedImageMimeType, "只支援 JPG、PNG、WebP 或 GIF 圖片。"),
      base64: z.string().min(1).max(6_000_000),
    })).mutation(({ ctx, input }) => uploadDiaryCoverImage({ userId: ctx.user.id, ...input })),
    deleteImage: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteDiaryEventMedia(ctx.user.id, input.id)),
  }),
  share: router({
    get: publicProcedure.input(z.object({ slug: z.string().trim().regex(/^story-[a-z0-9-]+$/), token: z.string().trim().min(16).max(128).optional(), password: z.string().min(1).max(128).optional() })).query(({ input }) => getSharedDiary(input.slug, input.token, input.password)),
  }),
});

export type AppRouter = typeof appRouter;

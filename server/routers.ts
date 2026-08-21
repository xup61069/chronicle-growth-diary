import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { createLocalUser, deleteAccount, getUserByEmail } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { hashLocalPassword, localOpenIdForEmail, normalizeLocalEmail, verifyLocalPassword } from "./localCredentials";
import { getAuthProvider } from "./providers/auth";
import { diaryRouter, shareRouter } from "./routers/diary";
import { statsRouter } from "./routers/stats";
import { photoMapRouter } from "./routers/photoMap";
import { recallChecksRouter } from "./routers/recallChecks";
import { archiveRestoreRouter } from "./routers/archiveRestore";

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

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    localAuthStatus: publicProcedure.query(() => ({
      enabled: ENV.authDriver === "local",
    })),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return { success: true } as const;
    }),
    deleteAccount: protectedProcedure.input(z.object({ confirmation: z.string().trim().refine((value) => value === "刪除我的帳號", "請輸入「刪除我的帳號」以確認。") })).mutation(async ({ ctx }) => {
      const result = await deleteAccount(ctx.user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return result;
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
  diary: diaryRouter,
  share: shareRouter,
  stats: statsRouter,
  photoMap: photoMapRouter,
  recallChecks: recallChecksRouter,
  archiveRestore: archiveRestoreRouter,
});

export type AppRouter = typeof appRouter;

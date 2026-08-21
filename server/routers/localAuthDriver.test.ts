import { beforeEach, describe, expect, it, vi } from "vitest";

const accountDb = vi.hoisted(() => ({
  createLocalUser: vi.fn(),
  deleteAccount: vi.fn(),
  getUserByEmail: vi.fn(),
}));

const authProvider = vi.hoisted(() => ({
  createSessionToken: vi.fn(async () => "local-session-token"),
}));

vi.mock("../db", () => accountDb);
vi.mock("../providers/auth", () => ({ getAuthProvider: () => authProvider }));

import { ENV } from "../_core/env";
import { appRouter } from "../routers";

describe("local credential fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountDb.getUserByEmail.mockResolvedValue(undefined);
    accountDb.createLocalUser.mockResolvedValue({
      openId: "local-test-user",
      name: "Local Test User",
    });
  });

  it("uses the supplied AUTH_DRIVER=local setting to allow the local registration endpoint", async () => {
    expect(ENV.authDriver).toBe("local");
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} },
      res,
    } as never);

    await caller.auth.localRegister({
      name: "Local Test User",
      email: "local-test@example.test",
      password: "a-long-local-test-password",
    });

    expect(accountDb.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "local-test@example.test",
      name: "Local Test User",
      passwordHash: expect.stringMatching(/^[a-f0-9]{32}:[a-f0-9]{128}$/),
    }));
    expect(authProvider.createSessionToken).toHaveBeenCalledWith("local-test-user", expect.any(Object));
    expect(res.cookie).toHaveBeenCalledWith("app_session_id", "local-session-token", expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    }));
  });

  it("exposes only the local-auth enabled state to the unauthenticated UI", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} },
      res: { cookie: vi.fn(), clearCookie: vi.fn() },
    } as never);

    await expect(caller.auth.localAuthStatus()).resolves.toEqual({ enabled: true });
  });
});

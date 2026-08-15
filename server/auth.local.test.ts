import { COOKIE_NAME } from "../shared/const";
import { ENV } from "./_core/env";
import { hashLocalPassword } from "./localCredentials";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createLocalUser: vi.fn(),
  getUserByEmail: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  createLocalUser: mocks.createLocalUser,
  getUserByEmail: mocks.getUserByEmail,
}));
vi.mock("./providers/auth", () => ({
  getAuthProvider: () => ({ createSessionToken: mocks.createSessionToken }),
}));

import { appRouter } from "./routers";

const localUser = {
  id: 7,
  openId: "local_example-open-id",
  name: "Local Chronicle",
  email: "local@example.com",
  loginMethod: "local",
  passwordHash: hashLocalPassword("a-strong-local-password"),
  emailVerified: false,
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext() {
  const cookie = vi.fn();
  return {
    ctx: {
      user: null,
      req: { protocol: "https", headers: {} },
      res: { cookie, clearCookie: vi.fn() },
    } as any,
    cookie,
  };
}

describe("auth local credentials", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    ENV.authDriver = "local";
    mocks.createSessionToken.mockResolvedValue("local-session-token");
  });

  it("registers a local account and writes the existing signed session cookie", async () => {
    mocks.getUserByEmail.mockResolvedValue(undefined);
    mocks.createLocalUser.mockResolvedValue(localUser);
    const { ctx, cookie } = createContext();

    const result = await appRouter.createCaller(ctx).auth.localRegister({
      name: "Local Chronicle",
      email: "LOCAL@EXAMPLE.COM",
      password: "a-strong-local-password",
    });

    expect(mocks.createLocalUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "local@example.com",
        name: "Local Chronicle",
        passwordHash: expect.not.stringContaining("a-strong-local-password"),
      })
    );
    expect(result).toEqual(localUser);
    expect(cookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      "local-session-token",
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: "none" })
    );
  });

  it("accepts only the correct local password and writes a session on login", async () => {
    mocks.getUserByEmail.mockResolvedValue(localUser);
    const { ctx, cookie } = createContext();

    const result = await appRouter.createCaller(ctx).auth.localLogin({
      email: "local@example.com",
      password: "a-strong-local-password",
    });

    expect(result).toEqual(localUser);
    expect(cookie).toHaveBeenCalledTimes(1);
    await expect(
      appRouter.createCaller(createContext().ctx).auth.localLogin({
        email: "local@example.com",
        password: "wrong-local-password",
      })
    ).rejects.toThrow("email 或密碼不正確");
  });
});

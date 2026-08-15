import { COOKIE_NAME, OAUTH_STATE_COOKIE, encodeOAuthState } from "../shared/const";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsertUser: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  getUserInfo: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock("./db", () => ({ upsertUser: mocks.upsertUser }));
vi.mock("./_core/sdk", () => ({
  sdk: {
    exchangeCodeForToken: mocks.exchangeCodeForToken,
    getUserInfo: mocks.getUserInfo,
    createSessionToken: mocks.createSessionToken,
  },
}));

import { registerOAuthRoutes } from "./_core/oauth";

type CallbackHandler = (req: any, res: any) => Promise<void>;

function registerCallback(): CallbackHandler {
  let callback: CallbackHandler | undefined;
  registerOAuthRoutes({
    get: (_path: string, handler: CallbackHandler) => {
      callback = handler;
    },
  } as any);
  if (!callback) throw new Error("OAuth callback was not registered");
  return callback;
}

describe("OAuth callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.exchangeCodeForToken.mockResolvedValue({ accessToken: "access-token" });
    mocks.getUserInfo.mockResolvedValue({
      openId: "chronicle-user",
      name: "Chronicle User",
      email: "user@example.com",
      loginMethod: "manus",
    });
    mocks.createSessionToken.mockResolvedValue("session-token");
  });

  it("creates a session and opens the private editor after a successful login", async () => {
    const callback = registerCallback();
    const nonce = "safe-login-nonce";
    const state = encodeOAuthState({
      redirectUri: "https://preview.example.com/api/oauth/callback",
      nonce,
    });
    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await callback(
      {
        query: { code: "authorization-code", state },
        headers: { cookie: `${OAUTH_STATE_COOKIE}=${nonce}` },
        protocol: "https",
      },
      res
    );

    expect(mocks.exchangeCodeForToken).toHaveBeenCalledWith("authorization-code", state);
    expect(mocks.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ openId: "chronicle-user" })
    );
    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      "session-token",
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: "none" })
    );
    expect(res.redirect).toHaveBeenCalledWith(302, "/editor");
  });
});

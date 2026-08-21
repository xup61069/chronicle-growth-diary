import { COOKIE_NAME, OAUTH_STATE_COOKIE, encodeOAuthState } from "../../../shared/const";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsertUser: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  getUserInfo: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock("../../db", () => ({ upsertUser: mocks.upsertUser }));
vi.mock("../../_core/sdk", () => ({
  sdk: {
    exchangeCodeForToken: mocks.exchangeCodeForToken,
    getUserInfo: mocks.getUserInfo,
    createSessionToken: mocks.createSessionToken,
  },
}));

import { registerOAuthRoutes } from "../../_core/oauth";

type CallbackHandler = (req: any, res: any) => Promise<void>;

function registerCallbacks(): Map<string, CallbackHandler> {
  const callbacks = new Map<string, CallbackHandler>();
  registerOAuthRoutes({
    get: (path: string, handler: CallbackHandler) => {
      callbacks.set(path, handler);
    },
  } as any);
  return callbacks;
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
    const callback = registerCallbacks().get("/api/oauth/callback");
    if (!callback) throw new Error("API OAuth callback was not registered");
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

  it("registers the deployment runtime callback alias and preserves its state for token exchange", async () => {
    const callbacks = registerCallbacks();
    const callback = callbacks.get("/manus-oauth/callback");
    if (!callback) throw new Error("Runtime OAuth callback was not registered");

    const nonce = "runtime-login-nonce";
    const state = encodeOAuthState({
      redirectUri: "https://chronotime.example.com/manus-oauth/callback",
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
        query: { code: "runtime-authorization-code", state },
        headers: { cookie: `${OAUTH_STATE_COOKIE}=${nonce}` },
        protocol: "https",
      },
      res
    );

    expect(callbacks.has("/api/oauth/callback")).toBe(true);
    expect(mocks.exchangeCodeForToken).toHaveBeenCalledWith("runtime-authorization-code", state);
    expect(res.redirect).toHaveBeenCalledWith(302, "/editor");
  });
});

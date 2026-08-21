import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { COOKIE_NAME, encodeOAuthState, OAUTH_STATE_COOKIE } from "@shared/const";

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

let server: Server | undefined;

function startMockCallbackApp() {
  const app = express();
  app.set("trust proxy", true);
  registerOAuthRoutes(app);
  return new Promise<string>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server?.address();
      if (!address || typeof address === "string") throw new Error("Mock OAuth callback server did not bind a TCP port");
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));
  server = undefined;
});

describe("mock OAuth provider callback smoke", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.exchangeCodeForToken.mockResolvedValue({ accessToken: "mock-provider-token" });
    mocks.getUserInfo.mockResolvedValue({ openId: "mock-oauth-user", name: "Mock OAuth User" });
    mocks.createSessionToken.mockResolvedValue("mock-session-token");
  });

  it.each(["/api/oauth/callback", "/manus-oauth/callback"])("redeems a mock authorization code at %s and redirects only to the editor", async (callbackPath) => {
    const origin = await startMockCallbackApp();
    const nonce = `mock-nonce-${callbackPath}`;
    const state = encodeOAuthState({ redirectUri: `${origin}${callbackPath}`, nonce });
    const response = await fetch(`${origin}${callbackPath}?code=mock-code&state=${encodeURIComponent(state)}`, {
      headers: { cookie: `${OAUTH_STATE_COOKIE}=${nonce}`, "x-forwarded-proto": "https" },
      redirect: "manual",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/editor");
    expect(response.headers.get("set-cookie")).toContain(`${COOKIE_NAME}=mock-session-token`);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
    expect(mocks.exchangeCodeForToken).toHaveBeenCalledWith("mock-code", state);
    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "mock-oauth-user" }));
  });

  it("fails closed before provider exchange when the nonce cookie is missing", async () => {
    const origin = await startMockCallbackApp();
    const state = encodeOAuthState({ redirectUri: `${origin}/api/oauth/callback`, nonce: "expected-nonce" });
    const response = await fetch(`${origin}/api/oauth/callback?code=mock-code&state=${encodeURIComponent(state)}`, { redirect: "manual" });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "invalid oauth state" });
    expect(mocks.exchangeCodeForToken).not.toHaveBeenCalled();
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });
});

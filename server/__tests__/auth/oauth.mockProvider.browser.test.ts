import express from "express";
import type { Server } from "node:http";
import { chromium, type Browser } from "@playwright/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
let browser: Browser | undefined;

function startMockCallbackApp() {
  const app = express();
  app.set("trust proxy", true);
  // The browser test is local HTTP. Keep callback cookie options equivalent to
  // production HTTPS without depending on an external provider or certificate.
  app.use((req, _res, next) => {
    req.headers["x-forwarded-proto"] = "https";
    next();
  });
  registerOAuthRoutes(app);
  return new Promise<string>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server?.address();
      if (!address || typeof address === "string") throw new Error("Mock OAuth browser app did not bind a TCP port");
      resolve(`http://localhost:${address.port}`);
    });
  });
}

afterEach(async () => {
  await browser?.close();
  browser = undefined;
  if (!server) return;
  await new Promise<void>((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));
  server = undefined;
});

describe("mock OAuth provider browser callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.exchangeCodeForToken.mockResolvedValue({ accessToken: "mock-provider-token" });
    mocks.getUserInfo.mockResolvedValue({ openId: "mock-browser-user", name: "Mock Browser User" });
    mocks.createSessionToken.mockResolvedValue("mock-browser-session");
  });

  it("uses a browser nonce cookie to complete the mock callback and lands only on the editor", async () => {
    const origin = await startMockCallbackApp();
    const nonce = "mock-browser-nonce";
    const state = encodeOAuthState({ redirectUri: `${origin}/api/oauth/callback`, nonce });
    browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: "commit" });
    await page.evaluate(({ name, value }) => { document.cookie = `${name}=${value}; Path=/; SameSite=None; Secure`; }, { name: OAUTH_STATE_COOKIE, value: nonce });
    expect(await page.evaluate(() => document.cookie)).toContain(`${OAUTH_STATE_COOKIE}=${nonce}`);

    await page.goto(`${origin}/api/oauth/callback?code=mock-browser-code&state=${encodeURIComponent(state)}`, { waitUntil: "commit" });

    expect(new URL(page.url()).pathname).toBe("/editor");
    expect(mocks.exchangeCodeForToken).toHaveBeenCalledWith("mock-browser-code", state);
    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "mock-browser-user" }));
    expect(await context.cookies(origin)).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: OAUTH_STATE_COOKIE })]));
    await context.close();
  }, 20_000);

  it("fails closed in the browser when the nonce cookie is absent", async () => {
    const origin = await startMockCallbackApp();
    const state = encodeOAuthState({ redirectUri: `${origin}/api/oauth/callback`, nonce: "missing-browser-nonce" });
    browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
    const page = await browser.newPage();

    const response = await page.goto(`${origin}/api/oauth/callback?code=mock-browser-code&state=${encodeURIComponent(state)}`);

    expect(response?.status()).toBe(403);
    expect(await page.textContent("body")).toContain("invalid oauth state");
    expect(mocks.exchangeCodeForToken).not.toHaveBeenCalled();
  }, 20_000);
});

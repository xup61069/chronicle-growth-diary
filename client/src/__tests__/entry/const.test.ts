import { afterEach, describe, expect, it, vi } from "vitest";
import { startLogin } from "../../const";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  vi.unstubAllEnvs();
});

describe("startLogin", () => {
  it("writes a short-lived OAuth nonce and redirects to the configured sign-in portal", () => {
    const location = { origin: "https://timeline.example.test", href: "" };
    const documentState = { cookie: "" };
    Object.defineProperty(globalThis, "window", { configurable: true, value: { location } });
    Object.defineProperty(globalThis, "document", { configurable: true, value: documentState });
    vi.stubEnv("VITE_OAUTH_PORTAL_URL", "https://login.example.test");
    vi.stubEnv("VITE_APP_ID", "chronicle-test-app");

    startLogin();

    expect(documentState.cookie).toContain("__Host-oauth_state=");
    expect(documentState.cookie).toContain("Max-Age=600");
    expect(documentState.cookie).toContain("SameSite=None");
    const destination = new URL(location.href);
    expect(destination.origin).toBe("https://login.example.test");
    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("app_id")).toBe("chronicle-test-app");
    expect(destination.searchParams.get("redirect_url")).toBe("https://timeline.example.test/api/oauth/callback");
    expect(destination.searchParams.has("appId")).toBe(false);
    expect(destination.searchParams.has("redirectUri")).toBe(false);
    expect(destination.searchParams.get("state")).toBeTruthy();
  });
});

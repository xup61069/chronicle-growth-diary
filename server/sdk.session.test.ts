import { COOKIE_NAME } from "../shared/const";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("./db", () => ({
  getUserByOpenId: mocks.getUserByOpenId,
  upsertUser: mocks.upsertUser,
}));

import { sdk } from "./_core/sdk";

describe("session authentication", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("accepts a session token produced for an OAuth user on a later protected request", async () => {
    const user = {
      id: 42,
      openId: "chronicle-user",
      name: "Chronicle User",
      email: "user@example.com",
      loginMethod: "manus",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    mocks.getUserByOpenId.mockResolvedValue(user);
    mocks.upsertUser.mockResolvedValue(undefined);

    const token = await sdk.createSessionToken(user.openId, {
      name: user.name,
    });
    const authenticated = await sdk.authenticateRequest({
      headers: { cookie: `${COOKIE_NAME}=${token}` },
    } as any);

    expect(mocks.getUserByOpenId).toHaveBeenCalledWith(user.openId);
    expect(authenticated).toEqual(user);
    expect(mocks.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ openId: user.openId })
    );
  });
});

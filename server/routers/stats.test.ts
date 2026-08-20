import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  getGrowthDashboardStats: vi.fn(),
}));

vi.mock("../db", () => db);

import { statsRouter } from "./stats";

const authenticatedContext = {
  user: {
    id: 7,
    openId: "stats-owner",
    name: "Stats Owner",
    email: "stats@example.com",
    loginMethod: "local",
    passwordHash: null,
    emailVerified: true,
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} },
  res: { cookie: () => undefined, clearCookie: () => undefined },
} as never;

describe("stats router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns owner-scoped dashboard aggregates through a protected procedure", async () => {
    db.getGrowthDashboardStats.mockResolvedValueOnce({ summary: { privateEventCount: 3 } });
    const caller = statsRouter.createCaller(authenticatedContext);

    await expect(caller.growth()).resolves.toMatchObject({ summary: { privateEventCount: 3 } });
    expect(db.getGrowthDashboardStats).toHaveBeenCalledWith(7);
  });

  it("does not allow an unauthenticated caller to request aggregates", async () => {
    const caller = statsRouter.createCaller({ ...authenticatedContext, user: null });

    await expect(caller.growth()).rejects.toThrow();
    expect(db.getGrowthDashboardStats).not.toHaveBeenCalled();
  });
});

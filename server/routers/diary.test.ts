import { appRouter } from "../routers";
import { describe, expect, it } from "vitest";

const authenticatedContext = {
  user: {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "local",
    passwordHash: null,
    emailVerified: false,
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} },
  res: { cookie: () => undefined, clearCookie: () => undefined },
} as any;

describe("diary router validation", () => {
  it("rejects an event with a missing title before calling persistence", async () => {
    const caller = appRouter.createCaller(authenticatedContext);
    await expect(
      caller.diary.createEvent({
        occurredAt: Date.now(),
        datePrecision: "day",
        eventType: "memory",
        title: "  ",
        body: "",
        color: "#EE623B",
        tagNames: [],
      })
    ).rejects.toThrow("請為這段記憶寫下標題");
  });

  it("rejects invalid public share slugs without querying diary data", async () => {
    const caller = appRouter.createCaller({ ...authenticatedContext, user: null });
    await expect(caller.share.get({ slug: "not-a-chronicle-story" })).rejects.toThrow();
  });

  it("rejects an over-sized batch import before calling persistence", async () => {
    const caller = appRouter.createCaller(authenticatedContext);
    const event = { occurredAt: Date.now(), datePrecision: "day" as const, eventType: "memory" as const, title: "匯入事件", body: "內容", color: "#EE623B", tagNames: [] };
    await expect(caller.diary.importEvents({ events: Array.from({ length: 251 }, () => event) })).rejects.toThrow();
  });
});

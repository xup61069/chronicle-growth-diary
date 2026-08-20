import { beforeEach, describe, expect, it, vi } from "vitest";

const maps = vi.hoisted(() => ({ makeStaticMapDataUrl: vi.fn() }));
vi.mock("../_core/map", () => maps);

import { photoMapRouter } from "./photoMap";

const authenticatedContext = {
  user: { id: 7, openId: "photo-map-owner", name: "Photo Map Owner", email: "map@example.com", loginMethod: "local", passwordHash: null, emailVerified: true, role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} },
  res: { cookie: () => undefined, clearCookie: () => undefined },
} as never;

describe("photo map router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a user-triggered static preview only for valid coordinates", async () => {
    maps.makeStaticMapDataUrl.mockResolvedValueOnce("data:image/png;base64,preview");
    const caller = photoMapRouter.createCaller(authenticatedContext);
    await expect(caller.preview({ latitude: 25.034, longitude: 121.551 })).resolves.toEqual({ dataUrl: "data:image/png;base64,preview" });
    expect(maps.makeStaticMapDataUrl).toHaveBeenCalledWith({ latitude: 25.034, longitude: 121.551 });
  });

  it("rejects missing authentication and out-of-range coordinates before fetching a map", async () => {
    await expect(photoMapRouter.createCaller({ ...authenticatedContext, user: null }).preview({ latitude: 25, longitude: 121 })).rejects.toThrow();
    await expect(photoMapRouter.createCaller(authenticatedContext).preview({ latitude: 91, longitude: 121 })).rejects.toThrow();
    expect(maps.makeStaticMapDataUrl).not.toHaveBeenCalled();
  });
});

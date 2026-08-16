import { describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  createLocalUser: vi.fn(),
  deleteAccount: vi.fn(async () => ({ deleted: true as const })),
  getUserByEmail: vi.fn(),
  createDiaryEvent: vi.fn(),
  deleteDiaryEvent: vi.fn(),
  deleteDiaryEventMedia: vi.fn(),
  deletePhaseReflection: vi.fn(),
  generatePhaseReflection: vi.fn(),
  getDiaryEventRevisions: vi.fn(),
  getDiarySnapshot: vi.fn(),
  getSharedDiary: vi.fn(),
  importDiaryEvents: vi.fn(),
  reorderDiaryEventMedia: vi.fn(),
  reorderDiaryEvents: vi.fn(),
  restoreDiaryEventRevision: vi.fn(),
  setDiaryEventVisibility: vi.fn(),
  updateDiaryAiPreference: vi.fn(),
  updateDiaryEvent: vi.fn(),
  updateDiaryEventMedia: vi.fn(),
  updateDiaryPhaseBoundaries: vi.fn(),
  updateDiarySharing: vi.fn(),
  updatePhaseReflection: vi.fn(),
  uploadDiaryCoverImage: vi.fn(),
  uploadDiaryEventImage: vi.fn(),
}));

vi.mock("./db", () => db);

import { appRouter } from "./routers";

function createContext() {
  const cleared: Array<{ name: string; options: Record<string, unknown> }> = [];
  return {
    cleared,
    ctx: {
      user: {
        id: 42,
        openId: "account-delete-test",
        name: "Delete Test",
        email: "delete@example.test",
        loginMethod: "local",
        passwordHash: null,
        emailVerified: false,
        role: "user" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} },
      res: {
        cookie: () => undefined,
        clearCookie: (name: string, options: Record<string, unknown>) => cleared.push({ name, options }),
      },
    } as any,
  };
}

describe("auth.deleteAccount", () => {
  it("rejects an inexact confirmation without deleting data", async () => {
    const { ctx } = createContext();
    await expect(appRouter.createCaller(ctx).auth.deleteAccount({ confirmation: "刪除帳號" })).rejects.toThrow("刪除我的帳號");
    expect(db.deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes only the authenticated account and clears its session cookie", async () => {
    const { ctx, cleared } = createContext();
    const result = await appRouter.createCaller(ctx).auth.deleteAccount({ confirmation: "刪除我的帳號" });

    expect(result).toEqual({ deleted: true });
    expect(db.deleteAccount).toHaveBeenCalledWith(42);
    expect(cleared).toHaveLength(1);
    expect(cleared[0]?.options).toMatchObject({ maxAge: -1, httpOnly: true, path: "/" });
  });
});

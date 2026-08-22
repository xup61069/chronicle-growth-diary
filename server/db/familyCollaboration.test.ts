import { describe, expect, it, vi } from "vitest";
import { acceptDiaryInviteForUser, getEventReactionsForUser, getFamilyMilestoneAudienceAuditForDiary } from "./familyCollaboration";

function createDbWithInvite(invite: unknown) {
  const limit = vi.fn().mockResolvedValue([invite]);
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({ limit })),
    })),
  }));
  const insert = vi.fn();
  const update = vi.fn();
  return { db: { select, insert, update } as never, insert, update };
}

describe("family collaboration data access", () => {
  it("rejects an invite when the accepted account email does not match before creating membership or audit rows", async () => {
    const { db, insert, update } = createDbWithInvite({
      id: 3,
      diaryId: 7,
      role: "commenter",
      invitedEmail: "family@example.com",
      acceptedAt: null,
      expiresAt: Date.now() + 60_000,
    });

    await expect(acceptDiaryInviteForUser(db, 12, "other@example.com", "safe-one-time-token"))
      .rejects.toThrow("這個家庭邀請不屬於目前帳號。");
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("returns only aggregate member reactions for a private event and rejects shared events", async () => {
    const privateSelect = vi.fn()
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ diaryId: 7, shareScope: "private" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 7 }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ reaction: "heart", authorUserId: 12 }, { reaction: "heart", authorUserId: 33 }, { reaction: "spark", authorUserId: 12 }]) })) });
    const privateDb = { select: privateSelect } as never;

    await expect(getEventReactionsForUser(privateDb, 12, 8)).resolves.toEqual([
      { reaction: "heart", count: 2, reactedByCurrentUser: true },
      { reaction: "spark", count: 1, reactedByCurrentUser: true },
      { reaction: "celebrate", count: 0, reactedByCurrentUser: false },
      { reaction: "support", count: 0, reactedByCurrentUser: false },
    ]);

    const sharedSelect = vi.fn()
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ diaryId: 7, shareScope: "link" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 7 }]) })) })) });
    await expect(getEventReactionsForUser({ select: sharedSelect } as never, 12, 8)).rejects.toThrow("完全私人的事件");
    expect(sharedSelect).toHaveBeenCalledTimes(2);
  });

  it("projects only passive audience-audit identifiers, action and timestamp for the owner view", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: 71, action: "family_milestone_audience_updated", targetId: 18, createdAt: new Date("2026-08-22T00:00:00Z") }]);
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ orderBy }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));

    await expect(getFamilyMilestoneAudienceAuditForDiary({ select } as never, 7)).resolves.toEqual([
      { id: 71, action: "family_milestone_audience_updated", targetId: 18, createdAt: new Date("2026-08-22T00:00:00Z") },
    ]);
    expect(Object.keys(select.mock.calls[0]?.[0] ?? {}).sort()).toEqual(["action", "createdAt", "id", "targetId"]);
  });
});

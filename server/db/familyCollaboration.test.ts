import { describe, expect, it, vi } from "vitest";
import { acceptDiaryInviteForUser } from "./familyCollaboration";

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
});

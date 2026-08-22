import { describe, expect, it, vi } from "vitest";
import { acceptDiaryInviteForUser, createEventCommentForUser, deleteEventCommentForUser, getEventCommentsForUser, getEventReactionsForUser, getFamilyMilestoneAudienceAuditForDiary } from "./familyCollaboration";

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

  it("keeps comments private, excludes deleted rows, and projects only current-user delete permissions", async () => {
    const rows = [{ id: 18, body: "合成留言", createdAt: new Date("2026-08-22T00:00:00Z"), authorName: "Family", authorUserId: 33 }];
    const select = vi.fn()
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ diaryId: 7, shareScope: "private" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ role: "commenter" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ innerJoin: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue(rows) })) })) })) });

    await expect(getEventCommentsForUser({ select } as never, 12, 8)).resolves.toEqual([
      { ...rows[0], canDelete: false, isOwnerModeration: false },
    ]);

    const sharedSelect = vi.fn()
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ diaryId: 7, shareScope: "public" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 7 }]) })) })) });
    await expect(getEventCommentsForUser({ select: sharedSelect } as never, 12, 8)).rejects.toThrow("完全私人的事件");
  });

  it("allows an active editor to read private comments but not moderate another member comment", async () => {
    const rows = [{ id: 18, body: "合成留言", createdAt: new Date("2026-08-22T00:00:00Z"), authorName: "Family", authorUserId: 33 }];
    const select = vi.fn()
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ diaryId: 7, shareScope: "private" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ role: "editor" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ innerJoin: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue(rows) })) })) })) });

    await expect(getEventCommentsForUser({ select } as never, 12, 8)).resolves.toEqual([
      { ...rows[0], canDelete: false, isOwnerModeration: false },
    ]);
  });

  it("rejects a removed member before selecting or projecting any private comments", async () => {
    const select = vi.fn()
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ diaryId: 7, shareScope: "private" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) });

    await expect(getEventCommentsForUser({ select } as never, 12, 8)).rejects.toThrow("沒有檢視或註解");
    expect(select).toHaveBeenCalledTimes(3);
  });

  it("allows an owner to tombstone another member comment and writes metadata-only moderation audit", async () => {
    const select = vi.fn()
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ diaryId: 7, shareScope: "private" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 7 }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 18, authorUserId: 33 }]) })) })) });
    const where = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn(() => ({ set: vi.fn(() => ({ where })) }));
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(() => ({ values }));

    await expect(deleteEventCommentForUser({ select, update, insert } as never, 12, 8, 18)).resolves.toEqual({ id: 18 });
    expect(update).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: "comment_deleted", targetType: "comment", targetId: 18 }));
    expect(JSON.stringify(values.mock.calls[0]?.[0]?.metadata ?? "")).not.toContain("合成留言");
  });

  it("allows a commenter to delete only their own active comment", async () => {
    const select = vi.fn()
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ diaryId: 7, shareScope: "private" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ role: "commenter" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 18, authorUserId: 12 }]) })) })) });
    const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) }));
    const insert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));

    await expect(deleteEventCommentForUser({ select, update, insert } as never, 12, 8, 18)).resolves.toEqual({ id: 18 });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("rejects a commenter attempting to delete another member comment before updating or auditing", async () => {
    const select = vi.fn()
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ diaryId: 7, shareScope: "private" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ role: "commenter" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 18, authorUserId: 33 }]) })) })) });
    const update = vi.fn();
    const insert = vi.fn();

    await expect(deleteEventCommentForUser({ select, update, insert } as never, 12, 8, 18)).rejects.toThrow("只能刪除自己");
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects comment creation for a non-private event before inserting the supplied body", async () => {
    const select = vi.fn()
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ diaryId: 7, shareScope: "link" }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 7 }]) })) })) });
    const insert = vi.fn();

    await expect(createEventCommentForUser({ select, insert } as never, 12, 8, "合成留言")).rejects.toThrow("完全私人的事件");
    expect(insert).not.toHaveBeenCalled();
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

  it("accepts owner-provided UTC bounds as query predicates without widening the audience audit projection", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ orderBy }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));

    await expect(getFamilyMilestoneAudienceAuditForDiary({ select } as never, 7, { from: Date.parse("2026-08-01T00:00:00Z"), to: Date.parse("2026-08-02T00:00:00Z") })).resolves.toEqual([]);
    expect(where).toHaveBeenCalledTimes(1);
    expect(Object.keys(select.mock.calls[0]?.[0] ?? {}).sort()).toEqual(["action", "createdAt", "id", "targetId"]);
  });
});

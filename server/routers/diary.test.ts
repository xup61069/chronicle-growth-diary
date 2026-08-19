import { beforeEach, describe, expect, it, vi } from "vitest";

const diaryDb = vi.hoisted(() => {
  const state = { publicCoverUrl: null as string | null };
  const getDiarySnapshot = vi.fn(async () => ({
    diary: { publicCoverUrl: state.publicCoverUrl },
    events: [],
    tags: [],
    lifePhases: [],
    sharing: { mode: "public", slug: "story-test-cover", hasPrivateLink: false, hasPassword: false, expiresAt: null, accessCount: 0, lastSharedAt: null, recentAccesses: [] },
    reflections: [],
  }));
  const uploadDiaryCoverImage = vi.fn(async () => {
    state.publicCoverUrl = "/manus-storage/growth-diary/1/cover/test-cover.webp";
    return { key: "growth-diary/1/cover/test-cover.webp", url: state.publicCoverUrl };
  });
  return {
    state,
    acceptDiaryInvite: vi.fn(async () => ({ diaryId: 2, role: "commenter" })),
    createDiaryInvite: vi.fn(async () => ({ id: 4, token: "family-invite-token-123456", expiresAt: 1_900_000_000_000, role: "commenter" })),
    getDiarySnapshot,
    createEventComment: vi.fn(async () => ({ id: 11, eventId: 8, body: "我也記得這一天。" })),
    getDiaryEventRevisions: vi.fn(async () => [{ id: 31, eventId: 8, version: 2, changeType: "update", snapshot: { title: "第二版" }, createdAt: new Date("2026-01-02") }]),
    getDiaryAuditLogs: vi.fn(async () => [{ id: 1, action: "invite_created", actorName: "Test User", createdAt: new Date() }]),
    getDiaryMembers: vi.fn(async () => [{ id: 7, userId: 2, role: "commenter", name: "Family", email: "family@example.com", createdAt: new Date() }]),
    getEventComments: vi.fn(async () => [{ id: 11, body: "我也記得這一天。", authorName: "Test User", createdAt: new Date() }]),
    uploadDiaryCoverImage,
    createDiaryEvent: vi.fn(),
    deleteDiaryEvent: vi.fn(),
    deleteDiaryEventMedia: vi.fn(),
    deletePhaseReflection: vi.fn(),
    generatePhaseReflection: vi.fn(),
    importDiaryEvents: vi.fn(),
    getSharedDiary: vi.fn(),
    reorderDiaryEventMedia: vi.fn(),
    reorderDiaryEvents: vi.fn(),
    removeDiaryMember: vi.fn(async () => ({ id: 7 })),
    restoreDiaryEventRevision: vi.fn(async () => ({ eventId: 8, restoredVersion: 3 })),
    setDiaryEventVisibility: vi.fn(),
    updateDiaryAiPreference: vi.fn(),
    updateDiaryEvent: vi.fn(),
    updateDiaryEventMedia: vi.fn(),
    updateDiaryPhaseBoundaries: vi.fn(),
    updateDiaryProfile: vi.fn(async () => ({ title: "閱讀中的成長史", subtitle: "把轉折留在時間帶上。" })),
    updateDiarySharing: vi.fn(async () => ({ mode: "public", slug: "story-test-cover", shareToken: null, hasPassword: false, expiresAt: null })),
    updateDiaryMemberRole: vi.fn(async () => ({ id: 7, role: "editor" })),
    updatePhaseReflection: vi.fn(),
    uploadDiaryEventImage: vi.fn(),
  };
});

vi.mock("../db", () => diaryDb);

import { diaryRouter, shareRouter } from "./diary";

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

beforeEach(() => {
  diaryDb.state.publicCoverUrl = null;
  vi.clearAllMocks();
});

describe("diary router validation", () => {
  it("rejects an event with a missing title before calling persistence", async () => {
    const caller = diaryRouter.createCaller(authenticatedContext);
    await expect(
      caller.createEvent({
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
    const caller = shareRouter.createCaller({ ...authenticatedContext, user: null });
    await expect(caller.get({ slug: "not-a-chronicle-story" })).rejects.toThrow();
  });

  it("rejects an over-sized batch import before calling persistence", async () => {
    const caller = diaryRouter.createCaller(authenticatedContext);
    const event = { occurredAt: Date.now(), datePrecision: "day" as const, eventType: "memory" as const, title: "匯入事件", body: "內容", color: "#EE623B", tagNames: [] };
    await expect(caller.importEvents({ events: Array.from({ length: 251 }, () => event) })).rejects.toThrow();
  });

  it("rejects event and image ordering payloads over their safe limits before persistence", async () => {
    const caller = diaryRouter.createCaller(authenticatedContext);

    await expect(caller.reorderEvents({ eventIds: Array.from({ length: 501 }, (_, index) => index + 1) })).rejects.toThrow();
    await expect(caller.reorderImages({ eventId: 1, mediaIds: Array.from({ length: 101 }, (_, index) => index + 1) })).rejects.toThrow();

    expect(diaryDb.reorderDiaryEvents).not.toHaveBeenCalled();
    expect(diaryDb.reorderDiaryEventMedia).not.toHaveBeenCalled();
  });

  it("rejects unsupported image media before storage is called", async () => {
    const caller = diaryRouter.createCaller(authenticatedContext);

    await expect(caller.uploadImage({
      eventId: 8,
      fileName: "memory.svg",
      mimeType: "image/svg+xml",
      base64: "dGVzdA==",
    })).rejects.toThrow("只支援 JPG、PNG、WebP 或 GIF 圖片");

    expect(diaryDb.uploadDiaryEventImage).not.toHaveBeenCalled();
  });

  it("只接受受限的日記標題與副標題以更新個人成長側寫", async () => {
    const caller = diaryRouter.createCaller(authenticatedContext);
    await expect(caller.updateProfile({ title: "  閱讀中的成長史  ", subtitle: "把轉折留在時間帶上。" })).resolves.toMatchObject({ title: "閱讀中的成長史" });
    expect(diaryDb.updateDiaryProfile).toHaveBeenCalledWith(1, { title: "閱讀中的成長史", subtitle: "把轉折留在時間帶上。" });
    await expect(caller.updateProfile({ title: "", subtitle: "" })).rejects.toThrow("請為這本成長史保留一個標題");
    await expect(caller.updateProfile({ title: "有效標題", subtitle: "x".repeat(241) })).rejects.toThrow();
  });

  it("preserves diary snapshot read errors so the client recovery state can respond", async () => {
    diaryDb.getDiarySnapshot.mockRejectedValueOnce(new Error("timeline unavailable"));
    const caller = diaryRouter.createCaller(authenticatedContext);

    await expect(caller.get()).rejects.toThrow("timeline unavailable");
    expect(diaryDb.getDiarySnapshot).toHaveBeenCalledWith(1);
  });

  it("connects an owned event editing flow from creation through media ordering and sharing", async () => {
    diaryDb.createDiaryEvent.mockResolvedValue({ id: 8 });
    diaryDb.uploadDiaryEventImage.mockResolvedValue({ id: 41, url: "/manus-storage/growth-diary/1/event/8/photo.webp" });
    const caller = diaryRouter.createCaller(authenticatedContext);
    const event = {
      occurredAt: 1_704_067_200_000,
      datePrecision: "day" as const,
      eventType: "achievement" as const,
      title: "完成第一份作品集",
      body: "整理了學習與創作歷程。",
      color: "#EE623B" as const,
      tagNames: ["創作"],
    };

    await caller.createEvent(event);
    await caller.updateEvent({ ...event, id: 8, body: "完成整理並公開分享。" });
    await caller.uploadImage({
      eventId: 8,
      fileName: "portfolio.webp",
      mimeType: "image/webp",
      base64: "dGVzdA==",
      caption: "作品集封面",
    });
    await caller.reorderImages({ eventId: 8, mediaIds: [41] });
    await caller.updateSharing({
      shareMode: "link",
      publicCoverTitle: "創作紀事",
      publicStoryLayout: "editorial",
      clearPublicCover: false,
    });

    expect(diaryDb.createDiaryEvent).toHaveBeenCalledWith(1, event);
    expect(diaryDb.updateDiaryEvent).toHaveBeenCalledWith(1, 8, expect.objectContaining({ body: "完成整理並公開分享。" }));
    expect(diaryDb.uploadDiaryEventImage).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, eventId: 8, caption: "作品集封面" }));
    expect(diaryDb.reorderDiaryEventMedia).toHaveBeenCalledWith(1, 8, [41]);
    expect(diaryDb.updateDiarySharing).toHaveBeenCalledWith(1, expect.objectContaining({ shareMode: "link", publicCoverTitle: "創作紀事", publicStoryLayout: "editorial" }));
  });

  it("forwards the open family diary id to editor creation, import, and ordering actions", async () => {
    diaryDb.createDiaryEvent.mockResolvedValue({ id: 8 });
    diaryDb.importDiaryEvents.mockResolvedValue({ importedCount: 1, eventIds: [8] });
    diaryDb.reorderDiaryEvents.mockResolvedValue({ eventIds: [8] });
    const caller = diaryRouter.createCaller(authenticatedContext);
    const event = { occurredAt: 1_704_067_200_000, datePrecision: "day" as const, eventType: "memory" as const, title: "家庭記事", body: "共同整理的記憶。", color: "#EE623B" as const, tagNames: [] };

    await caller.createEvent({ ...event, diaryId: 42 });
    await caller.importEvents({ diaryId: 42, events: [event] });
    await caller.reorderEvents({ diaryId: 42, eventIds: [8] });

    expect(diaryDb.createDiaryEvent).toHaveBeenCalledWith(1, event, 42);
    expect(diaryDb.importDiaryEvents).toHaveBeenCalledWith(1, [event], 42);
    expect(diaryDb.reorderDiaryEvents).toHaveBeenCalledWith(1, [8], 42);
  });

  it("keeps a public cover after sharing configuration, upload, and a subsequent diary read", async () => {
    const caller = diaryRouter.createCaller(authenticatedContext);
    await caller.updateSharing({ shareMode: "public", publicCoverTitle: "海岸檔案", publicStoryLayout: "minimal", clearPublicCover: false });
    const uploaded = await caller.uploadCoverImage({ fileName: "cover.webp", mimeType: "image/webp", base64: "dGVzdA==" });
    const refreshedDiary = await caller.get();

    expect(diaryDb.updateDiarySharing).toHaveBeenCalledWith(1, expect.objectContaining({ shareMode: "public", publicCoverTitle: "海岸檔案", publicStoryLayout: "minimal" }));
    expect(diaryDb.uploadDiaryCoverImage).toHaveBeenCalledWith({ userId: 1, fileName: "cover.webp", mimeType: "image/webp", base64: "dGVzdA==" });
    expect(uploaded.url).toBe("/manus-storage/growth-diary/1/cover/test-cover.webp");
    expect(refreshedDiary.diary.publicCoverUrl).toBe(uploaded.url);
  });

  it("scopes event revision reads and restores to the authenticated diary owner", async () => {
    const caller = diaryRouter.createCaller(authenticatedContext);
    const revisions = await caller.getEventRevisions({ eventId: 8 });
    const restored = await caller.restoreEventRevision({ eventId: 8, revisionId: 31 });

    expect(diaryDb.getDiaryEventRevisions).toHaveBeenCalledWith(1, 8);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.snapshot.title).toBe("第二版");
    expect(diaryDb.restoreDiaryEventRevision).toHaveBeenCalledWith(1, 8, 31);
    expect(restored).toEqual({ eventId: 8, restoredVersion: 3 });
  });

  it("creates family invites and event comments only through protected account-scoped helpers", async () => {
    const caller = diaryRouter.createCaller(authenticatedContext);
    const invite = await caller.createFamilyInvite({ email: "family@example.com", role: "commenter", expiresAt: Date.now() + 120_000 });
    const comment = await caller.createEventComment({ eventId: 8, body: "我也記得這一天。" });
    const comments = await caller.getEventComments({ eventId: 8 });

    expect(diaryDb.createDiaryInvite).toHaveBeenCalledWith(1, expect.objectContaining({ email: "family@example.com", role: "commenter" }));
    expect(invite.role).toBe("commenter");
    expect(diaryDb.createEventComment).toHaveBeenCalledWith(1, 8, "我也記得這一天。");
    expect(comment.id).toBe(11);
    expect(diaryDb.getEventComments).toHaveBeenCalledWith(1, 8);
    expect(comments).toHaveLength(1);
  });

  it("rejects expired family invites and empty event comments before persistence", async () => {
    const caller = diaryRouter.createCaller(authenticatedContext);
    await expect(caller.createFamilyInvite({ email: "family@example.com", role: "editor", expiresAt: Date.now() - 1 })).rejects.toThrow();
    await expect(caller.createEventComment({ eventId: 8, body: "  " })).rejects.toThrow();
    expect(diaryDb.createDiaryInvite).not.toHaveBeenCalled();
    expect(diaryDb.createEventComment).not.toHaveBeenCalled();
  });

  it("reads and removes family members through account-scoped helpers", async () => {
    const caller = diaryRouter.createCaller(authenticatedContext);
    const members = await caller.getFamilyMembers();
    const audit = await caller.getFamilyAudit();
    await caller.removeFamilyMember({ memberId: 7 });
    await caller.updateFamilyMemberRole({ memberId: 7, role: "editor" });
    expect(members[0]?.email).toBe("family@example.com");
    expect(audit[0]?.action).toBe("invite_created");
    expect(diaryDb.getDiaryMembers).toHaveBeenCalledWith(1);
    expect(diaryDb.getDiaryAuditLogs).toHaveBeenCalledWith(1);
    expect(diaryDb.removeDiaryMember).toHaveBeenCalledWith(1, 7);
    expect(diaryDb.updateDiaryMemberRole).toHaveBeenCalledWith(1, 7, "editor");
  });
});

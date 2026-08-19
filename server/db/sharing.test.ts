import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnrichedDiaryEvents: vi.fn(),
}));

vi.mock("./diaryRead", () => ({
  getEnrichedDiaryEvents: mocks.getEnrichedDiaryEvents,
}));

import { persistDiarySharing, readSharedDiary } from "./sharing";
import { hashShareToken } from "../shareAccess";

function createDb(selectRows: unknown[] = []) {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values }));
  const limit = vi.fn().mockResolvedValue(selectRows);
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({ limit })),
    })),
  }));

  return {
    db: { select, update, insert } as never,
    update,
    set,
    insert,
    values,
  };
}

const sharedDiary = {
  id: 7,
  title: "成長檔案",
  subtitle: "一段可分享的記憶",
  shareMode: "public",
  shareSlug: "story-growth-file",
  shareTokenHash: null,
  sharePasswordHash: null,
  shareExpiresAt: null,
  shareAccessCount: 0,
  publicCoverUrl: "https://example.test/cover.webp",
  publicCoverTitle: "從這裡開始",
  publicStoryLayout: "editorial",
  birthYear: 1990,
  educationStartYear: null,
  educationEndYear: null,
  careerStartYear: null,
  careerEndYear: null,
  childhoodStartYear: null,
  childhoodEndYear: null,
} as never;

describe("sharing data access", () => {
  it("clears every private-link credential when a diary returns to private mode", async () => {
    const { db, set } = createDb();
    const diary = {
      ...sharedDiary,
      shareMode: "link",
      shareTokenHash: "hashed-token",
      sharePasswordHash: "hashed-password",
      shareExpiresAt: 1_800_000_000_000,
    } as never;

    const result = await persistDiarySharing(db, diary, { shareMode: "private" });

    expect(result).toMatchObject({ mode: "private", hasPassword: false, expiresAt: null });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      shareTokenHash: null,
      sharePasswordHash: null,
      shareExpiresAt: null,
    }));
  });

  it("returns a safe not-found status without querying public events", async () => {
    const { db } = createDb([]);

    await expect(readSharedDiary(db, "story-missing")).resolves.toEqual({ status: "not_found" });
    expect(mocks.getEnrichedDiaryEvents).not.toHaveBeenCalled();
  });

  it("returns explicitly public events and records a non-identifying access entry", async () => {
    const { db, set, values } = createDb([sharedDiary]);
    mocks.getEnrichedDiaryEvents.mockResolvedValueOnce([
      { id: 2, occurredAt: Date.UTC(2000, 0, 1), tags: [], media: [] },
    ]);

    const result = await readSharedDiary(db, "story-growth-file");

    expect(result).toMatchObject({
      status: "ok",
      diary: { publicCoverTitle: "從這裡開始", publicStoryLayout: "editorial" },
    });
    expect(mocks.getEnrichedDiaryEvents).toHaveBeenCalledWith(db, 7, "public");
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ lastSharedAt: expect.any(Date) }));
    expect(values).toHaveBeenCalledWith({ diaryId: 7, channel: "public" });
  });

  it("strips precise coordinates and only exposes city-level place text to shared readers", async () => {
    const { db } = createDb([sharedDiary]);
    mocks.getEnrichedDiaryEvents.mockResolvedValueOnce([
      { id: 2, occurredAt: Date.UTC(2000, 0, 1), place: "台北市信義區", mapLatitudeE6: 25_033_000, mapLongitudeE6: 121_565_000, locationPrivacy: "precise", tags: [], media: [] },
      { id: 3, occurredAt: Date.UTC(2001, 0, 1), place: "台中", mapLatitudeE6: 24_147_000, mapLongitudeE6: 120_673_000, locationPrivacy: "city", tags: [], media: [] },
      { id: 4, occurredAt: Date.UTC(2002, 0, 1), place: "私人地點", mapLatitudeE6: null, mapLongitudeE6: null, locationPrivacy: "none", tags: [], media: [] },
    ]);

    const result = await readSharedDiary(db, "story-growth-file");

    expect(result).toMatchObject({
      status: "ok",
      events: [
        { id: 2, place: null, mapLatitudeE6: null, mapLongitudeE6: null },
        { id: 3, place: "台中", mapLatitudeE6: null, mapLongitudeE6: null },
        { id: 4, place: null, mapLatitudeE6: null, mapLongitudeE6: null },
      ],
    });
  });

  it("masks every private field of an unexpired time capsule before returning shared events", async () => {
    const { db } = createDb([sharedDiary]);
    mocks.getEnrichedDiaryEvents.mockResolvedValueOnce([
      { id: 9, occurredAt: Date.UTC(2026, 0, 1), title: "給未來的我", body: "不能提早讀到的內容", ageLabel: "30 歲", place: "私人地點", media: [{ url: "https://example.test/private.jpg" }], tags: [{ name: "私人" }], skills: [{ name: "秘密技能" }], phaseKeywords: ["尚未公開"], comparisonGroup: "秘密演進", soundtrackTitle: "秘密音樂", soundtrackUrl: "https://example.test/private.mp3", unlocksAt: Date.now() + 86_400_000, locationPrivacy: "city", mapLatitudeE6: 25_033_000, mapLongitudeE6: 121_565_000 },
    ]);

    const result = await readSharedDiary(db, "story-growth-file");

    expect(result).toMatchObject({ status: "ok", events: [{ id: 9, title: "時空膠囊鎖定中", body: "這段記憶將在指定日期解鎖。", ageLabel: null, place: null, media: [], tags: [], skills: [], phaseKeywords: [], comparisonGroup: null, soundtrackTitle: null, soundtrackUrl: null, isTimeCapsuleLocked: true, mapLatitudeE6: null, mapLongitudeE6: null }] });
  });

  it("uses the broader link scope only when the diary itself is shared by a private link", async () => {
    const { db } = createDb([{ ...sharedDiary, shareMode: "link", shareTokenHash: hashShareToken("valid-token") }]);
    mocks.getEnrichedDiaryEvents.mockResolvedValueOnce([]);

    await readSharedDiary(db, "story-growth-file", "valid-token");

    expect(mocks.getEnrichedDiaryEvents).toHaveBeenCalledWith(db, 7, "link");
  });
});

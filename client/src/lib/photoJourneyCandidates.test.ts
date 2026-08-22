import { describe, expect, it } from "vitest";
import { buildPhotoJourneyCandidates, MAX_JOURNEY_CANDIDATE_GAP_MS, MAX_JOURNEY_CANDIDATE_STEP_DISTANCE_KM, mergePhotoJourneyImportGroups, MIN_PHOTOS_PER_JOURNEY_CANDIDATE } from "./photoJourneyCandidates";

const photo = (id: string, capturedAt: string, latitude = "25.034", longitude = "121.551") => ({ id, capturedAt, latitude, longitude });

describe("photo journey candidates", () => {
  it("creates one stable review-only candidate from three continuous photos without file access", () => {
    const input = [
      photo("late", "2026-08-22T10:30", "25.035", "121.553"),
      photo("first", "2026-08-22T09:00"),
      photo("middle", "2026-08-22T10:00", "25.0345", "121.552"),
    ];
    const first = buildPhotoJourneyCandidates(input);
    const second = buildPhotoJourneyCandidates([...input].reverse());
    expect(first).toEqual(second);
    expect(first).toMatchObject([{
      photoIds: ["first", "middle", "late"],
      startedAt: "2026-08-22T09:00",
      endedAt: "2026-08-22T10:30",
      title: "照片旅程候選：2026 年 08 月 22 日",
      latitude: 25.0345,
      longitude: 121.552,
    }]);
  });

  it("excludes missing or invalid time and GPS metadata without changing valid candidates", () => {
    const candidates = buildPhotoJourneyCandidates([
      photo("one", "2026-08-22T09:00"),
      photo("two", "2026-08-22T10:00"),
      photo("three", "2026-08-22T11:00"),
      photo("missing-time", "", "25.034", "121.551"),
      photo("invalid-latitude", "2026-08-22T11:30", "91", "121.551"),
      photo("invalid-longitude", "2026-08-22T11:45", "25.034", "181"),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.photoIds).toEqual(["one", "two", "three"]);
  });

  it("splits candidates at explicit time and distance boundaries and rejects undersized segments", () => {
    const farEastLongitude = String(121.551 + MAX_JOURNEY_CANDIDATE_STEP_DISTANCE_KM / 40);
    const candidates = buildPhotoJourneyCandidates([
      photo("first", "2026-08-22T09:00"),
      photo("second", "2026-08-22T10:00"),
      photo("third", "2026-08-22T11:00"),
      photo("far", "2026-08-22T12:00", "25.034", farEastLongitude),
      photo("later-one", new Date(new Date("2026-08-22T12:00").getTime() + MAX_JOURNEY_CANDIDATE_GAP_MS + 1).toISOString().slice(0, 16)),
      photo("later-two", "2026-08-23T19:00"),
      photo("later-three", "2026-08-23T20:00"),
    ]);
    expect(MIN_PHOTOS_PER_JOURNEY_CANDIDATE).toBe(3);
    expect(candidates.map((candidate) => candidate.photoIds)).toEqual([["first", "second", "third"], ["later-one", "later-two", "later-three"]]);
  });

  it("calculates a bounded spherical center across the international date line", () => {
    const candidates = buildPhotoJourneyCandidates([
      photo("one", "2026-08-22T09:00", "10", "179.9"),
      photo("two", "2026-08-22T10:00", "10", "-179.9"),
      photo("three", "2026-08-22T11:00", "10", "179.8"),
    ]);
    expect(candidates).toHaveLength(1);
    expect(Math.abs(candidates[0]!.longitude)).toBeGreaterThan(179);
    expect(candidates[0]!.latitude).toBeCloseTo(10, 3);
  });

  it("replaces ordinary date groups for selected candidates so a photo is only imported once", () => {
    const candidatePhotos = [
      photo("one", "2026-08-22T09:00"),
      photo("two", "2026-08-22T10:00"),
      photo("three", "2026-08-22T11:00"),
      photo("ordinary", "2026-08-22T12:00", "", ""),
    ];
    const candidates = buildPhotoJourneyCandidates(candidatePhotos);
    const fileFor = (id: string) => new File([id], `${id}.jpg`, { type: "image/jpeg" });
    const importPhotos = candidatePhotos.map((item) => ({ ...item, file: fileFor(item.id), format: "jpeg" as const, livePhotoCompanion: null, source: "manual" as const, gpsSource: item.latitude ? "manual" as const : "none" as const }));
    const groups = mergePhotoJourneyImportGroups(importPhotos, candidates, [candidates[0]!.id]);
    expect(groups.map((group) => ({ title: group.title, photoIds: group.photoIds }))).toEqual([
      { title: "照片旅程候選：2026 年 08 月 22 日", photoIds: ["one", "two", "three"] },
      { title: "照片記錄：2026 年 8 月 22 日", photoIds: ["ordinary"] },
    ]);
    expect(groups.flatMap((group) => group.photoIds)).toHaveLength(new Set(groups.flatMap((group) => group.photoIds)).size);
  });
});

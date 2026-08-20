import { describe, expect, it } from "vitest";
import { applyPhotoCapturedAt, preparePhotoExifImport, updatePhotoCapturedAt, updatePhotoLocation } from "./photoExifImport";

const file = (name: string, type = "image/jpeg", size = 100) => ({ name, type, size } as File);

function makeExifJpeg(date = "2026:08:20 09:30:00") {
  const dateBytes = new TextEncoder().encode(`${date}\0`);
  const tiff = new Uint8Array([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x02,
    0x87, 0x69, 0x00, 0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x26,
    0x88, 0x25, 0x00, 0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x4c,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x90, 0x03, 0x00, 0x02, 0x00, 0x00, 0x00, 0x14, 0x00, 0x00, 0x00, 0x38, 0x00, 0x00, 0x00, 0x00,
    ...dateBytes,
    0x00, 0x04,
    0x00, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x4e, 0x00, 0x00, 0x00,
    0x00, 0x02, 0x00, 0x05, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x82,
    0x00, 0x03, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x45, 0x00, 0x00, 0x00,
    0x00, 0x04, 0x00, 0x05, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x9a,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x19, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x18, 0x00, 0x00, 0x00, 0x0a,
    0x00, 0x00, 0x00, 0x79, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x21, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x24, 0x00, 0x00, 0x00, 0x0a,
  ]);
  const payload = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff]);
  const length = payload.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...payload, 0xff, 0xd9]);
}

describe("photo EXIF import", () => {
  it("reads a real JPEG DateTimeOriginal locally and groups it by the captured calendar date", async () => {
    const jpeg = new File([makeExifJpeg()], "captured.jpg", { type: "image/jpeg" });
    const preview = await preparePhotoExifImport([jpeg]);
    expect(preview.skipped).toEqual([]);
    expect(preview.photos.map((photo) => ({ capturedAt: photo.capturedAt, source: photo.source }))).toEqual([{ capturedAt: "2026-08-20T09:30", source: "exif" }]);
    expect(preview.photos.map((photo) => ({ latitude: photo.latitude, longitude: photo.longitude, gpsSource: photo.gpsSource }))).toEqual([{ latitude: "25.034", longitude: "121.551", gpsSource: "exif" }]);
    expect(preview.groups.map((group) => ({ date: group.date, count: group.files.length }))).toEqual([{ date: "2026-08-20", count: 1 }]);
  });

  it("groups JPEGs by captured local date, chunks groups to the event image limit, and does not require location metadata", async () => {
    const files = Array.from({ length: 9 }, (_, index) => file(`photo-${index}.jpg`));
    const preview = await preparePhotoExifImport(files, async () => new Date(2026, 7, 20, 9, 5));
    expect(preview.skipped).toEqual([]);
    expect(preview.groups.map((group) => ({ date: group.date, title: group.title, count: group.files.length }))).toEqual([
      { date: "2026-08-20", title: "照片記錄：2026 年 8 月 20 日（第 1 批）", count: 8 },
      { date: "2026-08-20", title: "照片記錄：2026 年 8 月 20 日（第 2 批）", count: 1 },
    ]);
  });

  it("keeps missing or unreadable EXIF JPEGs as manual date candidates while rejecting unsupported and oversized files", async () => {
    const preview = await preparePhotoExifImport([
      file("other.png", "image/png"),
      file("large.jpg", "image/jpeg", 4 * 1024 * 1024 + 1),
      file("missing.jpg"),
      file("broken.jpg"),
    ], async (input) => {
      if (input.name === "broken.jpg") throw new Error("invalid EXIF");
      return input.name === "missing.jpg" ? null : new Date(2026, 0, 1);
    });
    expect(preview.groups).toEqual([]);
    expect(preview.skipped.map((item) => item.reason)).toEqual([
      "目前只讀取 JPEG 的拍攝日期",
      "單張照片超過 4MB",
    ]);
    expect(preview.photos.map((photo) => ({ name: photo.file.name, capturedAt: photo.capturedAt, source: photo.source }))).toEqual([
      { name: "missing.jpg", capturedAt: "", source: "manual" },
      { name: "broken.jpg", capturedAt: "", source: "manual" },
    ]);
  });

  it("rebuilds date groups after a user manually fills or adjusts a captured local date and time", async () => {
    const preview = await preparePhotoExifImport([file("no-exif.jpg"), file("from-exif.jpg")], async (input) => input.name === "no-exif.jpg" ? null : new Date(2026, 7, 20, 7, 15));
    const filled = updatePhotoCapturedAt(preview, preview.photos[0].id, "2026-08-21T18:45");
    const adjusted = updatePhotoCapturedAt(filled, filled.photos[1].id, "2026-08-21T06:30");
    expect(adjusted.photos.map((photo) => ({ name: photo.file.name, capturedAt: photo.capturedAt, source: photo.source }))).toEqual([
      { name: "no-exif.jpg", capturedAt: "2026-08-21T18:45", source: "manual" },
      { name: "from-exif.jpg", capturedAt: "2026-08-21T06:30", source: "manual" },
    ]);
    expect(adjusted.groups.map((group) => ({ date: group.date, occurredAt: group.occurredAt, count: group.files.length }))).toEqual([
      { date: "2026-08-21", occurredAt: new Date(2026, 7, 21, 6, 30).getTime(), count: 2 },
    ]);
  });

  it("reads normalized GPS for the local preview and derives a private event coordinate from the first valid photo in a group", async () => {
    const preview = await preparePhotoExifImport([file("gps.jpg")], async () => new Date(2026, 7, 20, 9, 5), async () => ({ latitude: 25.033964, longitude: 121.564468 }));
    expect(preview.photos.map((photo) => ({ latitude: photo.latitude, longitude: photo.longitude, gpsSource: photo.gpsSource }))).toEqual([
      { latitude: "25.033964", longitude: "121.564468", gpsSource: "exif" },
    ]);
    expect(preview.groups.map((group) => ({ latitude: group.mapLatitudeE6, longitude: group.mapLongitudeE6 }))).toEqual([
      { latitude: 25_033_964, longitude: 121_564_468 },
    ]);
  });

  it("allows manual GPS correction and applies one local date-time to a selected set of missing-EXIF photos", async () => {
    const preview = await preparePhotoExifImport([file("one.jpg"), file("two.jpg"), file("three.jpg")], async () => null, async () => null);
    const withBatchDate = applyPhotoCapturedAt(preview, [preview.photos[0].id, preview.photos[1].id], "2026-08-22T14:20");
    const corrected = updatePhotoLocation(withBatchDate, withBatchDate.photos[1].id, "25.0478", "121.5319");
    expect(corrected.groups.map((group) => ({ date: group.date, count: group.files.length, latitude: group.mapLatitudeE6, longitude: group.mapLongitudeE6 }))).toEqual([
      { date: "2026-08-22", count: 2, latitude: 25_047_800, longitude: 121_531_900 },
    ]);
    expect(corrected.photos[2].capturedAt).toBe("");
  });
});

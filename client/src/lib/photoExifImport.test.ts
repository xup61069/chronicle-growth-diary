import { describe, expect, it } from "vitest";
import { preparePhotoExifImport } from "./photoExifImport";

const file = (name: string, type = "image/jpeg", size = 100) => ({ name, type, size } as File);

function makeExifJpeg(date = "2026:08:20 09:30:00") {
  const dateBytes = new TextEncoder().encode(`${date}\0`);
  const tiff = new Uint8Array([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x01, 0x87, 0x69, 0x00, 0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x1a, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x90, 0x03, 0x00, 0x02, 0x00, 0x00, 0x00, 0x14, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
    ...dateBytes,
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
    expect(preview.groups.map((group) => ({ date: group.date, count: group.files.length }))).toEqual([{ date: "2026-08-20", count: 1 }]);
  });

  it("groups JPEGs by captured local date, chunks groups to the event image limit, and does not require location metadata", async () => {
    const files = Array.from({ length: 9 }, (_, index) => file(`photo-${index}.jpg`));
    const preview = await preparePhotoExifImport(files, async () => new Date(2026, 7, 20, 9));
    expect(preview.skipped).toEqual([]);
    expect(preview.groups.map((group) => ({ date: group.date, title: group.title, count: group.files.length }))).toEqual([
      { date: "2026-08-20", title: "照片記錄：2026 年 8 月 20 日（第 1 批）", count: 8 },
      { date: "2026-08-20", title: "照片記錄：2026 年 8 月 20 日（第 2 批）", count: 1 },
    ]);
  });

  it("reports unsupported files, oversized files, missing dates and parser failures without preparing them for upload", async () => {
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
      "找不到可用的拍攝日期",
      "無法讀取拍攝日期",
    ]);
  });
});

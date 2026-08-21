import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");

describe("full diary archive security contract", () => {
  it("uses an owner-only data path and explicitly excludes credentials, access logs, and storage keys", () => {
    const db = readFileSync(resolve(root, "server/db.ts"), "utf8");
    const archive = readFileSync(resolve(root, "server/db/fullDiaryArchive.ts"), "utf8");
    const portableArchive = readFileSync(resolve(root, "client/src/lib/fullDiaryArchive.ts"), "utf8");
    const router = readFileSync(resolve(root, "server/routers/diary.ts"), "utf8");

    expect(db).toContain("const diary = await getOwnedDiary(userId);");
    expect(router).toContain("exportFullArchive: protectedProcedure.mutation");
    expect(portableArchive).toContain('"shareTokenHash"');
    expect(portableArchive).toContain('"sharePasswordHash"');
    expect(portableArchive).toContain('"storageKey"');
    expect(portableArchive).toContain('"scheduleCronTaskUid"');
    expect(archive).toContain("sourceUrl: item.url");
    expect(archive).toContain("assetId");
  });
});

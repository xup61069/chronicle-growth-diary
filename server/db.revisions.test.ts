import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => {
  type QueueItem = unknown[];
  const selectQueue: QueueItem[] = [];
  const deletedWhere = vi.fn(async () => undefined);
  const updatedWhere = vi.fn(async () => undefined);
  const insertedValues = vi.fn(async () => undefined);

  const createSelectChain = () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.from = vi.fn(() => chain);
    chain.innerJoin = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => {
      (chain as Record<string, unknown>).then = (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject);
      return chain;
    });
    chain.limit = vi.fn(async () => selectQueue.shift() ?? []);
    return chain;
  };

  const db = {
    select: vi.fn(() => createSelectChain()),
    delete: vi.fn(() => ({ where: deletedWhere })),
    update: vi.fn(() => {
      const chain = { set: vi.fn(() => chain), where: updatedWhere };
      return chain;
    }),
    insert: vi.fn(() => ({ values: insertedValues })),
  };

  return {
    db,
    deletedWhere,
    insertedValues,
    selectQueue,
    updatedWhere,
    reset() {
      selectQueue.length = 0;
      vi.clearAllMocks();
    },
  };
});

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => harness.db) }));

let dbHelpers: typeof import("./db");

const initialSnapshot = JSON.stringify({
  occurredAt: 1_704_067_200_000,
  datePrecision: "day",
  eventType: "memory",
  title: "第一版",
  body: "原始內容",
  ageLabel: null,
  place: null,
  color: "#EE623B",
  isPublic: false,
  timelinePosition: 0,
  tagNames: [],
});

beforeAll(async () => {
  process.env.DATABASE_URL = "mysql://chronicle-test:password@localhost:3306/chronicle";
  dbHelpers = await import("./db");
});

beforeEach(() => {
  harness.reset();
});

describe("event revision data helpers", () => {
  it("reads an owned event's revision snapshots in descending version order", async () => {
    harness.selectQueue.push(
      [{ id: 8, diaryId: 4 }],
      [{ id: 22, eventId: 8, version: 2, changeType: "update", snapshot: initialSnapshot, createdAt: new Date("2026-08-15") }],
    );

    const revisions = await dbHelpers.getDiaryEventRevisions(3, 8);

    expect(revisions).toEqual([
      expect.objectContaining({ id: 22, eventId: 8, version: 2, changeType: "update", snapshot: expect.objectContaining({ title: "第一版" }) }),
    ]);
    expect(harness.db.select).toHaveBeenCalledTimes(2);
  });

  it("restores an owned snapshot and records a new restore revision", async () => {
    harness.selectQueue.push(
      [{ id: 8, diaryId: 4 }],
      [{ id: 22, eventId: 8, version: 1, changeType: "create", snapshot: initialSnapshot, createdAt: new Date("2026-08-15") }],
      [{ id: 8, diaryId: 4 }],
      [{ id: 8, occurredAt: 1_704_067_200_000, datePrecision: "day", eventType: "memory", title: "第一版", body: "原始內容", ageLabel: null, place: null, color: "#EE623B", isPublic: false, timelinePosition: 0 }],
      [],
      [{ version: 2 }],
    );

    const result = await dbHelpers.restoreDiaryEventRevision(3, 8, 22);

    expect(result).toEqual({ eventId: 8, restoredVersion: 3 });
    expect(harness.updatedWhere).toHaveBeenCalled();
    expect(harness.insertedValues).toHaveBeenCalledWith(expect.objectContaining({ eventId: 8, version: 3, changeType: "restore" }));
  });
});

describe("account deletion data helper", () => {
  it("rejects a missing account and deletes only after confirming it exists", async () => {
    harness.selectQueue.push([]);
    await expect(dbHelpers.deleteAccount(77)).rejects.toThrow("找不到要刪除的帳號");
    expect(harness.deletedWhere).not.toHaveBeenCalled();

    harness.selectQueue.push([{ id: 77 }]);
    await expect(dbHelpers.deleteAccount(77)).resolves.toEqual({ deleted: true });
    expect(harness.deletedWhere).toHaveBeenCalledTimes(1);
  });
});

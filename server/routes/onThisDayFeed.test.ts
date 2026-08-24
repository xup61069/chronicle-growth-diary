import express from "express";
import { describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  getDb: vi.fn(),
  getOnThisDayIcsByToken: vi.fn(),
}));

vi.mock("../db", () => ({ getDb: mocked.getDb }));
vi.mock("../db/onThisDayFeed", () => ({
  getOnThisDayIcsByToken: mocked.getOnThisDayIcsByToken,
}));

import { registerOnThisDayFeedRoute } from "./onThisDayFeed";

async function withServer<T>(app: express.Express, run: (origin: string) => Promise<T>) {
  const server = await new Promise<ReturnType<express.Express["listen"]>>(resolve => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("ICS test server did not expose a TCP port");
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

describe("On This Day ICS HTTP route", () => {
  it("returns actual HTTP 401 for invalid, revoked, or expired token lookup results", async () => {
    mocked.getDb.mockResolvedValue({});
    mocked.getOnThisDayIcsByToken.mockResolvedValue(null);
    const app = express();
    registerOnThisDayFeedRoute(app);

    await withServer(app, async origin => {
      const invalid = await fetch(`${origin}/api/feeds/on-this-day/${"a".repeat(24)}.ics`);
      expect(invalid.status).toBe(401);
      expect(invalid.headers.get("cache-control")).toBeNull();
    });
    expect(mocked.getOnThisDayIcsByToken).toHaveBeenCalledWith({}, "a".repeat(24));
  });
});

import express from "express";
import { describe, expect, it } from "vitest";
import { GENERAL_BODY_LIMIT, handleRequestBodyParserError, registerRequestBodyParsers, TRPC_BODY_LIMIT } from "../../_core/bodyParsers";

async function withServer<T>(app: express.Express, run: (origin: string) => Promise<T>) {
  const server = await new Promise<ReturnType<express.Express["listen"]>>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function payload(bytes: number) {
  return JSON.stringify({ base64: "a".repeat(bytes) });
}

describe("server request body limits", () => {
  it("keeps general requests small and grants only tRPC enough space for bounded base64 media", async () => {
    expect(GENERAL_BODY_LIMIT).toBe("2mb");
    expect(TRPC_BODY_LIMIT).toBe("25mb");

    const app = express();
    registerRequestBodyParsers(app);
    app.use(handleRequestBodyParserError);
    app.post("/api/general", (_req, res) => res.status(204).end());
    app.post("/api/trpc/upload", (_req, res) => res.status(204).end());

    await withServer(app, async (origin) => {
      const largeJson = payload(3 * 1024 * 1024);
      const [generalResponse, trpcResponse] = await Promise.all([
        fetch(`${origin}/api/general`, { method: "POST", headers: { "content-type": "application/json" }, body: largeJson }),
        fetch(`${origin}/api/trpc/upload`, { method: "POST", headers: { "content-type": "application/json" }, body: largeJson }),
      ]);

      expect(generalResponse.status).toBe(413);
      await expect(generalResponse.json()).resolves.toEqual({ error: "request-body-too-large" });
      expect(trpcResponse.status).toBe(204);
    });
  });
});

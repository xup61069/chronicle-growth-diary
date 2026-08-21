import type { Express } from "express";
import { getStorageProvider } from "../providers/storage";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*key", async (req, res) => {
    const rawKey = (req.params as Record<string, string | string[]>).key;
    const key = Array.isArray(rawKey) ? rawKey.join("/") : rawKey;
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await getStorageProvider().getSignedUrl(key);

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch {
      console.error("[StorageProxy] failed", {
        operation: "storage_proxy",
        code: "storage-proxy-failed",
      });
      res.status(502).send("Storage proxy error");
    }
  });
}

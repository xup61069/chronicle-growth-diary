import { afterEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  getSignedUrl: vi.fn(),
}));

vi.mock("../../providers/storage", () => ({
  getStorageProvider: () => storage,
}));
vi.mock("../../_core/env", () => ({
  ENV: {
    forgeApiUrl: "https://notifications.example.test/",
    forgeApiKey: "test-notification-key",
  },
}));

import { notifyOwner } from "../../_core/notification";
import { registerStorageProxy } from "../../_core/storageProxy";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  storage.getSignedUrl.mockReset();
});

describe("service error log redaction", () => {
  it("does not log a storage key or upstream failure detail", async () => {
    let handler: ((req: any, res: any) => Promise<void>) | undefined;
    registerStorageProxy({ get: (_path: string, callback: typeof handler) => { handler = callback; } } as any);
    if (!handler) throw new Error("storage proxy route was not registered");
    const privateFailure = "storage denied for private/diary/child-photo.jpg";
    storage.getSignedUrl.mockRejectedValueOnce(new Error(privateFailure));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      set: vi.fn(),
      redirect: vi.fn(),
    };

    await handler({ params: { key: ["private", "diary", "child-photo.jpg"] } }, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.send).toHaveBeenCalledWith("Storage proxy error");
    expect(errorSpy).toHaveBeenCalledWith("[StorageProxy] failed", {
      operation: "storage_proxy",
      code: "storage-proxy-failed",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(privateFailure);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("child-photo.jpg");
  });

  it("does not log notification content, upstream text, or network exceptions", async () => {
    const privateTitle = "祖父母月報：小孩的私人事件";
    const privateContent = "本月日記內容不可出現在錯誤日誌。";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "private upstream detail",
      text: vi.fn().mockResolvedValue("provider response contains private detail"),
    }).mockRejectedValueOnce(new Error("network exception contains private detail"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(notifyOwner({ title: privateTitle, content: privateContent })).resolves.toBe(false);
    await expect(notifyOwner({ title: privateTitle, content: privateContent })).resolves.toBe(false);

    expect(warnSpy).toHaveBeenNthCalledWith(1, "[Notification] Request rejected", {
      operation: "owner_notification",
      code: "notification-upstream-failed",
      status: 503,
    });
    expect(warnSpy).toHaveBeenNthCalledWith(2, "[Notification] Request failed", {
      operation: "owner_notification",
      code: "notification-request-failed",
    });
    const logged = JSON.stringify(warnSpy.mock.calls);
    expect(logged).not.toContain(privateTitle);
    expect(logged).not.toContain(privateContent);
    expect(logged).not.toContain("private upstream detail");
    expect(logged).not.toContain("network exception contains private detail");
  });
});

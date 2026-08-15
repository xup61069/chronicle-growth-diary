import { connectionStatusLabel, getConnectionStatus } from "./connectionStatus";
import { describe, expect, it } from "vitest";

describe("connection status", () => {
  it("keeps the privacy-preserving quick note status copy explicit", () => {
    expect(connectionStatusLabel(getConnectionStatus(true))).toBe("連線中");
    expect(connectionStatusLabel(getConnectionStatus(false))).toBe("離線草稿模式");
  });
});

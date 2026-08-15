import { describe, expect, it } from "vitest";
import { assertAiEnabled } from "./db";

describe("AI privacy preference", () => {
  it("permits generation only when the owner has enabled AI", () => {
    expect(() => assertAiEnabled(true)).not.toThrow();
    expect(() => assertAiEnabled(false)).toThrow("你已關閉 AI 回顧");
  });
});

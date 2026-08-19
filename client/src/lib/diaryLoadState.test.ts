import { describe, expect, it } from "vitest";
import { getDiaryLoadStatus } from "./diaryLoadState";

describe("getDiaryLoadStatus", () => {
  it("keeps a pending request in the loading shell before its timeout", () => {
    expect(getDiaryLoadStatus({ isLoading: true, hasError: false, timedOut: false })).toBe("loading");
  });

  it("prioritizes a timed-out request over the loading shell so recovery controls render", () => {
    expect(getDiaryLoadStatus({ isLoading: true, hasError: false, timedOut: true })).toBe("error");
  });

  it("surfaces a completed query error and allows a successful response to render", () => {
    expect(getDiaryLoadStatus({ isLoading: false, hasError: true, timedOut: false })).toBe("error");
    expect(getDiaryLoadStatus({ isLoading: false, hasError: false, timedOut: false })).toBe("ready");
  });
});

import { describe, expect, it } from "vitest";
import { isMobileMenuDismissKey, shouldHandleTimelineArrowKey } from "./homeNavigation";

describe("home navigation keyboard helpers", () => {
  it("recognizes Escape as the mobile menu dismissal key", () => {
    expect(isMobileMenuDismissKey("Escape")).toBe(true);
    expect(isMobileMenuDismissKey("Enter")).toBe(false);
  });

  it("only lets timeline arrow keys run while focus is outside interactive controls", () => {
    expect(shouldHandleTimelineArrowKey("ArrowLeft", "DIV")).toBe(true);
    expect(shouldHandleTimelineArrowKey("ArrowRight", undefined)).toBe(true);
    expect(shouldHandleTimelineArrowKey("ArrowLeft", "BUTTON")).toBe(false);
    expect(shouldHandleTimelineArrowKey("ArrowRight", "a")).toBe(false);
    expect(shouldHandleTimelineArrowKey("ArrowLeft", "DIV", true)).toBe(false);
    expect(shouldHandleTimelineArrowKey("Escape", "DIV")).toBe(false);
  });
});

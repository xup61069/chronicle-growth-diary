export const isMobileMenuDismissKey = (key: string) => key === "Escape";

const INTERACTIVE_TAGS = new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]);

export const shouldHandleTimelineArrowKey = (
  key: string,
  tagName: string | null | undefined,
  isContentEditable = false,
) => {
  if (key !== "ArrowLeft" && key !== "ArrowRight") return false;
  if (isContentEditable) return false;
  return !INTERACTIVE_TAGS.has(tagName?.toUpperCase() ?? "");
};

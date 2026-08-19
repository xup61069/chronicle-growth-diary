export type DiaryLoadStatus = "loading" | "error" | "ready";

export function getDiaryLoadStatus(input: {
  isLoading: boolean;
  hasError: boolean;
  timedOut: boolean;
}): DiaryLoadStatus {
  if (input.hasError || input.timedOut) return "error";
  if (input.isLoading) return "loading";
  return "ready";
}

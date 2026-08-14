/** Domain helpers for the personal growth diary editor. */

export const EVENT_TYPES = ["memory", "learning", "achievement", "chapter"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_COLORS = ["#EE623B", "#587A8B", "#78976D", "#A06A82", "#D19B43"] as const;

export function normalizeTagNames(tagNames: string[]): string[] {
  const seen = new Set<string>();

  return tagNames
    .map((tag) => tag.trim().replace(/\s+/g, " "))
    .filter((tag) => tag.length > 0 && tag.length <= 24)
    .filter((tag) => {
      const key = tag.toLocaleLowerCase("zh-Hant");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

export function safeMediaName(fileName: string): string {
  const safe = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return safe || "memory-image";
}

export function isSupportedImageMimeType(mimeType: string): boolean {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType);
}

export const QUICK_NOTE_STORAGE_KEY = "chronicle.quick-note.v1";

export type QuickNoteDraft = {
  body: string;
  updatedAt: number;
};

export type WebShareTargetPayload = {
  title?: string | null;
  text?: string | null;
  url?: string | null;
};

const MAX_QUICK_NOTE_LENGTH = 8_000;

function cleanSharedText(value: string | null | undefined, limit = MAX_QUICK_NOTE_LENGTH) {
  return (value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, limit);
}

function safeSharedUrl(value: string | null | undefined) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "";
  } catch {
    return "";
  }
}

/**
 * Transforms a PWA Web Share Target query payload into local-only draft text.
 * No event, media, account, or network write occurs here.
 */
export function createSharedQuickNoteFragment(payload: WebShareTargetPayload) {
  const title = cleanSharedText(payload.title, 240);
  const text = cleanSharedText(payload.text);
  const url = safeSharedUrl(payload.url);
  const parts = [title ? `# ${title}` : "", text, url ? `來源：${url}` : ""].filter(Boolean);
  return parts.join("\n\n").slice(0, MAX_QUICK_NOTE_LENGTH);
}

export function mergeSharedQuickNoteDraft(existing: QuickNoteDraft, fragment: string, updatedAt = Date.now()): QuickNoteDraft {
  const incoming = cleanSharedText(fragment);
  if (!incoming || existing.body.includes(incoming)) return existing;
  const body = existing.body.trim() ? `${existing.body.trim()}\n\n---\n\n${incoming}` : incoming;
  return createQuickNoteDraft(body.slice(0, MAX_QUICK_NOTE_LENGTH), updatedAt);
}

export function createQuickNoteDraft(body = "", updatedAt = Date.now()): QuickNoteDraft {
  return { body, updatedAt };
}

export function parseQuickNoteDraft(raw: string | null): QuickNoteDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<QuickNoteDraft>;
    if (typeof parsed.body !== "string" || typeof parsed.updatedAt !== "number") return null;
    return { body: parsed.body, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

export function formatQuickNoteForClipboard(draft: QuickNoteDraft) {
  const date = new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(draft.updatedAt));
  return `# Chronicle 快速記事\n\n${draft.body.trim()}\n\n— 草稿更新於 ${date}`;
}
